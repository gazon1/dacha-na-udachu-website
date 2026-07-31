import type { Endpoint } from 'payload'
import { z } from 'zod'
import { bookingSubmitLimiter } from '../../lib/rate-limit'

/**
 * Zod schemas — fail-fast validation at the edge before any DB work.
 */
const SubmitSchema = z
  .object({
    house: z.union([z.number(), z.string()]).refine((v) => v !== '', {
      message: 'house is required',
    }),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
    checkOut: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
    name: z.string().min(2).max(255),
    phone: z.string().min(5).max(50),
    telegram: z.string().max(255).optional().or(z.literal('')),
    guestNum: z.number().int().min(1).max(50),
    options: z.record(z.string(), z.number()).optional(),
    // Honeypot — must be empty (bots fill hidden fields).
    website: z.string().max(0).optional(),
  })
  .refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
    message: 'checkOut must be after checkIn',
    path: ['checkOut'],
  })

const QuoteSchema = z.object({
  house: z.union([z.number(), z.string()]),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  options: z.record(z.string(), z.number()).optional(),
})

const AvailabilitySchema = z.object({
  house: z.union([z.number(), z.string()]),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const BlockedSchema = z.object({
  house: z.union([z.number(), z.string()]),
})

/**
 * Booking endpoints — POST /api/bookings/submit, /quote, /availability.
 * The :id slugs come from the collection config (path: '/bookings/submit').
 */
export const bookingEndpoints: Endpoint[] = [
  {
    path: '/submit',
    method: 'post',
    handler: async (req) => {
      if (!bookingSubmitLimiter.check(req)) {
        return Response.json({ error: 'rate_limited' }, { status: 429 })
      }
      const body = await req.json?.().catch(() => ({}))
      const parsed = SubmitSchema.safeParse(body)
      if (!parsed.success) {
        return Response.json(
          { error: 'invalid_input', details: parsed.error.flatten() },
          { status: 400 },
        )
      }
      // Honeypot tripped — silently 200 so bots don't retry.
      if (parsed.data.website) {
        return Response.json({ ok: true })
      }

      const { house, checkIn, checkOut, name, phone, telegram, guestNum, options } =
        parsed.data

      // Resolve house by slug or id.
      const isId = typeof house === 'number'
      const houseRes = await req.payload.find({
        collection: 'houses',
        where: {
          and: [
            isId ? { id: { equals: house } } : { slug: { equals: String(house) } },
            { bookingEnabled: { equals: true } },
          ],
        },
        limit: 1,
        depth: 0,
      })
      const houseDoc = houseRes.docs[0]
      if (!houseDoc) {
        return Response.json({ error: 'house_not_found' }, { status: 404 })
      }
      if (typeof houseDoc.capacity === 'number' && guestNum > houseDoc.capacity) {
        return Response.json(
          { error: 'capacity_exceeded', capacity: houseDoc.capacity },
          { status: 400 },
        )
      }

      // Check date overlap with existing bookings.
      const overlap = await req.payload.find({
        collection: 'bookings',
        where: {
          and: [
            { house: { equals: houseDoc.id } },
            { checkIn: { less_than: checkOut } },
            { checkOut: { greater_than: checkIn } },
          ],
        },
        limit: 1,
        depth: 0,
      })
      if (overlap.totalDocs > 0) {
        return Response.json({ error: 'dates_unavailable' }, { status: 409 })
      }

      // Compute price snapshot.
      const nights = Math.max(
        1,
        Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            86_400_000,
        ),
      )
      const basePrice = Number(houseDoc.basePrice ?? 0)
      let extrasPrice = 0
      if (options && Object.keys(options).length > 0) {
        const extrasRes = await req.payload.find({
          collection: 'extra-services',
          where: {
            slug: { in: Object.keys(options) },
            isActive: { equals: true },
          },
          limit: 100,
          depth: 0,
        })
        for (const ex of extrasRes.docs) {
          const slug = String((ex as { slug: string }).slug)
          const qty = Number(options[slug] ?? 0)
          if (qty > 0) {
            extrasPrice += qty * Number((ex as { price: number }).price ?? 0)
          }
        }
      }

      const created = await req.payload.create({
        collection: 'bookings',
        // Pass req to keep access-control + optional override-lock consistent.
        req,
        data: {
          house: houseDoc.id,
          checkIn,
          checkOut,
          name,
          phone,
          telegram: telegram || undefined,
          guestNum,
          isConfirmed: false,
          options: options ?? {},
          basePrice,
          extrasPrice,
          totalPrice: basePrice * nights + extrasPrice,
        },
      })

      return Response.json({ ok: true, id: created.id }, { status: 201 })
    },
  },

  {
    path: '/quote',
    method: 'get',
    handler: async (req) => {
      const url = new URL(req.url ?? 'http://localhost:3000')
      const params = Object.fromEntries(url.searchParams.entries())
      const parsed = QuoteSchema.safeParse({
        house: params.house,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        options: params.options ? JSON.parse(params.options) : undefined,
      })
      if (!parsed.success) {
        return Response.json(
          { error: 'invalid_input', details: parsed.error.flatten() },
          { status: 400 },
        )
      }
      const { house, checkIn, checkOut, options } = parsed.data
      const isId = typeof house === 'number'
      const houseRes = await req.payload.find({
        collection: 'houses',
        where: isId
          ? { id: { equals: house } }
          : { slug: { equals: String(house) } },
        limit: 1,
        depth: 0,
      })
      const houseDoc = houseRes.docs[0]
      if (!houseDoc) {
        return Response.json({ error: 'house_not_found' }, { status: 404 })
      }
      const nights = Math.max(
        1,
        Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            86_400_000,
        ),
      )
      const basePrice = Number(houseDoc.basePrice ?? 0)
      let extrasPrice = 0
      if (options && Object.keys(options).length > 0) {
        const extrasRes = await req.payload.find({
          collection: 'extra-services',
          where: {
            slug: { in: Object.keys(options) },
            isActive: { equals: true },
          },
          limit: 100,
          depth: 0,
        })
        for (const ex of extrasRes.docs) {
          const slug = String((ex as { slug: string }).slug)
          const qty = Number(options[slug] ?? 0)
          if (qty > 0) {
            extrasPrice += qty * Number((ex as { price: number }).price ?? 0)
          }
        }
      }
      const totalPrice = basePrice * nights + extrasPrice
      return Response.json({
        nights,
        basePrice,
        extrasPrice,
        totalPrice,
      })
    },
  },

  {
    path: '/availability',
    method: 'get',
    handler: async (req) => {
      const url = new URL(req.url ?? 'http://localhost:3000')
      const params = Object.fromEntries(url.searchParams.entries())
      const parsed = AvailabilitySchema.safeParse({
        house: params.house,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      })
      if (!parsed.success) {
        return Response.json(
          { error: 'invalid_input', details: parsed.error.flatten() },
          { status: 400 },
        )
      }
      const { house, checkIn, checkOut } = parsed.data
      const isId = typeof house === 'number'
      const houseRes = await req.payload.find({
        collection: 'houses',
        where: isId
          ? { id: { equals: house } }
          : { slug: { equals: String(house) } },
        limit: 1,
        depth: 0,
      })
      const houseDoc = houseRes.docs[0]
      if (!houseDoc) {
        return Response.json({ error: 'house_not_found' }, { status: 404 })
      }
      const overlap = await req.payload.find({
        collection: 'bookings',
        where: {
          and: [
            { house: { equals: houseDoc.id } },
            { checkIn: { less_than: checkOut } },
            { checkOut: { greater_than: checkIn } },
          ],
        },
        limit: 1,
        depth: 0,
      })
      return Response.json({ available: overlap.totalDocs === 0 })
    },
  },

  {
    // Returns all currently-booked date ranges for a house so the calendar
    // picker can disable those days. Filters out cancelled/unconfirmed holes
    // by checking against `checkIn`/`checkOut` only — admin can flip
    // `isConfirmed` without freeing the dates from the picker.
    path: '/blocked',
    method: 'get',
    handler: async (req) => {
      const url = new URL(req.url ?? 'http://localhost:3000')
      const params = Object.fromEntries(url.searchParams.entries())
      const parsed = BlockedSchema.safeParse({ house: params.house })
      if (!parsed.success) {
        return Response.json(
          { error: 'invalid_input', details: parsed.error.flatten() },
          { status: 400 },
        )
      }
      const { house } = parsed.data
      const isId = typeof house === 'number'
      const houseRes = await req.payload.find({
        collection: 'houses',
        where: isId
          ? { id: { equals: house } }
          : { slug: { equals: String(house) } },
        limit: 1,
        depth: 0,
      })
      const houseDoc = houseRes.docs[0]
      if (!houseDoc) {
        return Response.json({ error: 'house_not_found' }, { status: 404 })
      }
      // Fetch all bookings that end in the future (or recently) so we don't
      // ship a 5-year history. Limit 200 is generous for any real house.
      const today = new Date().toISOString().slice(0, 10)
      const bookingsRes = await req.payload.find({
        collection: 'bookings',
        where: {
          and: [
            { house: { equals: houseDoc.id } },
            { checkOut: { greater_than: today } },
          ],
        },
        limit: 200,
        sort: 'checkIn',
        depth: 0,
      })
      const ranges = bookingsRes.docs
        .map((b) => {
          const bk = b as { checkIn: string; checkOut: string }
          return { from: bk.checkIn, to: bk.checkOut }
        })
        .filter((r) => r.from && r.to)
      return Response.json({ ranges })
    },
  },
]
