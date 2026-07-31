import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Дача на удачу'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Default Open Graph image — branding card with the site name.
 * Used by sites like Slack, Telegram, Facebook, etc.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          color: '#ffffff',
          padding: '80px',
          justifyContent: 'center',
          alignItems: 'flex-start',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#d4a574',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          Загородный клуб
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.05,
            marginBottom: 32,
          }}
        >
          Дача
          <br />
          на удачу
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: '#a0a0a0',
            maxWidth: '70%',
          }}
        >
          Уютное пространство для встреч, мероприятий и отдыха
        </div>
      </div>
    ),
    { ...size },
  )
}
