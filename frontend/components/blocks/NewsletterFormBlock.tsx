"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Некорректный email"),
});

type FormData = z.infer<typeof schema>;

export function NewsletterFormBlock() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Подписка оформлена!");
        reset();
      } else {
        toast.error("Ошибка. Попробуйте позже.");
      }
    } catch {
      toast.error("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <input
          {...register("email")}
          type="email"
          placeholder="Ваш email"
          className="form-input w-full"
        />
        {errors.email && (
          <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>
      <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
        {loading ? "..." : "Подписаться"}
      </button>
    </form>
  );
}
