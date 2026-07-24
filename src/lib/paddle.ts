export const PLANS = {
  free: { id: "free", label: "Free", price: 0, projectsPerMonth: 1, postsPerMonth: 5, providers: 2 },
  starter: { id: "starter", label: "Starter", price: 19, projectsPerMonth: 10, postsPerMonth: 50, providers: 4, paddlePriceId: "" },
  pro: { id: "pro", label: "Pro", price: 49, projectsPerMonth: Infinity, postsPerMonth: Infinity, providers: 6, paddlePriceId: "" },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPaddleCheckoutUrl(priceId: string, customerEmail: string): string {
  const base = process.env.PADDLE_VENDOR_URL || "https://checkout.paddle.com";
  return `${base}/checkout/${priceId}?email=${encodeURIComponent(customerEmail)}`;
}
