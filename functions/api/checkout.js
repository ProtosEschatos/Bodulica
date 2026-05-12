import Stripe from 'stripe';
export async function onRequestPost(context) {
  const stripe = new Stripe(context.env.STRIPE_SECRET_KEY);
  const body = await context.request.json();
  const line_items = body.items.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: { name: item.name || 'Proizvod' },
      unit_amount: Math.round((item.unit_price || item.price) * 100),
    },
    quantity: item.quantity || item.qty,
  }));
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    customer_email: body.customer_email,
    success_url: 'https://bodulica.shop/success',
    cancel_url: 'https://bodulica.shop/',
  });
  return Response.json({ url: session.url });
}
