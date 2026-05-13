// Deno Edge Function - runs in Supabase Edge Runtime - v3
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface Product {
  id?: string
  name: string
  brand?: string
  category: string
  price: number
  stock_quantity: number
  is_active: boolean
  is_unique: boolean
  description?: string
  dimensions?: string
  materials?: string
  image_url?: string
  images?: string[]
  stripe_price_id?: string
  slug?: string
  badge?: string
  created_at?: string
  updated_at?: string
}

interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface CheckoutItem {
  product_id: string
  quantity: number
  unit_price?: number
}

interface Order {
  id?: string
  order_number?: string
  customer_email: string
  customer_name?: string
  customer_phone?: string
  shipping_name?: string
  shipping_address?: string
  shipping_city?: string
  shipping_postal_code?: string
  shipping_country?: string
  status?: string
  subtotal: number
  shipping_cost: number
  total: number
  items: OrderItem[]
  stripe_session_id?: string
  stripe_payment_intent?: string
  created_at?: string
}

// Admin authentication - simple password check
const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD')
const JWT_SECRET = Deno.env.get('JWT_SECRET')

if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is required')
}

if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set - required for production use')
}

function generateToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return btoa(`${timestamp}:${random}:${ADMIN_PASSWORD}`)
}

function verifyToken(token: string): boolean {
  try {
    const decoded = atob(token)
    const parts = decoded.split(':')
    return parts.length === 3 && parts[2] === ADMIN_PASSWORD
  } catch {
    return false
  }
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

async function createStripePrice(product: Product): Promise<string | null> {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  console.log('Stripe key exists:', !!stripeKey)
  console.log('Key prefix:', stripeKey?.substring(0, 7))
  console.log('Key length:', stripeKey?.length)
  
  if (!stripeKey) {
    console.error('No Stripe key found')
    return null
  }

  try {
    // Create Stripe product
    const productRes = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        name: product.name,
        description: product.description || '',
        'metadata[category]': product.category,
        'metadata[brand]': product.brand || '',
      }).toString(),
    })

    if (!productRes.ok) {
      console.error('Stripe product error:', await productRes.text())
      return null
    }

    const stripeProduct = await productRes.json()
    console.log('Stripe product created:', stripeProduct.id)

    // Create Stripe price
    const priceRes = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        product: stripeProduct.id,
        unit_amount: Math.round(product.price * 100).toString(), // cents
        currency: 'eur',
      }).toString(),
    })

    if (!priceRes.ok) {
      console.error('Stripe price error:', await priceRes.text())
      return null
    }

    const stripePrice = await priceRes.json()
    console.log('Stripe price created:', stripePrice.id)
    return stripePrice.id
  } catch (error) {
    console.error('Stripe error:', error.message)
    return null
  }
}

async function updateStripePrice(stripePriceId: string, product: Product): Promise<boolean> {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return false

  try {
    // Archive old price and create new one
    await fetch(`https://api.stripe.com/v1/prices/${stripePriceId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        active: 'false',
      }).toString(),
    })

    return true
  } catch (error) {
    console.error('Stripe update error:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const fullPath = url.pathname
  const method = req.method
  console.log(`Request received: ${method} ${fullPath}`)

  // Extract path after /bodulica-api
  let path = fullPath
  const apiMatch = fullPath.match(/\/(bodulica-api)(.*)/)
  if (apiMatch && apiMatch[2]) {
    path = apiMatch[2]
  }
  
  console.log(`Matched internal path: ${path}`)

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://mbputwgppweoeujiszgv.supabase.co'
  const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Public endpoints
    if (path === '/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (path === '/products' && method === 'GET') {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify(products || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Single product (public)
    if (path.startsWith('/products/') && method === 'GET') {
      const id = path.split('/products/')[1]?.split('/')[0]
      console.log('Extracted product ID:', id)
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'Product ID not found', debug_id: id }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      console.log('Product query result:', product, 'Error:', error)

      if (error || !product) {
        return new Response(JSON.stringify({ 
          error: 'Product not found', 
          debug_id: id, 
          debug_error: error?.message 
        }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(product), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin login (public)
    if (path === '/api/login' && method === 'POST') {
      const body = await req.json()
      
      if (body.password === ADMIN_PASSWORD) {
        const token = generateToken()
        return new Response(JSON.stringify({ ok: true, token }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: 'Netočna lozinka' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Protected admin endpoints - verify token
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    const isAdmin = token && verifyToken(token)

    // Stats endpoint (admin only)
    if (path === '/api/stats' && method === 'GET') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      const { data: revenue } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'paid')

      const totalRevenue = revenue?.reduce((sum, o) => sum + (o.total || 0), 0) || 0

      const { data: customers } = await supabase
        .from('orders')
        .select('customer_email')

      const uniqueCustomers = new Set(customers?.map(c => c.customer_email) || []).size

      return new Response(JSON.stringify({
        products: productCount || 0,
        orders: orderCount || 0,
        revenue: totalRevenue,
        uniqueCustomers,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // All products (admin only)
    if (path === '/api/products' && method === 'GET') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify(products || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Single product (admin only)
    if (path.startsWith('/api/products/') && method === 'GET') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const productMatch = path.match(/^\/api\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)
      if (!productMatch) {
        return new Response(JSON.stringify({ error: 'Invalid product ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      const id = productMatch[1]
      console.log('Looking for product ID:', id)
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      console.log('Product query result:', product, 'Error:', error)

      if (error) throw error

      return new Response(JSON.stringify(product || {}), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create product (admin only)
    if (path === '/api/products' && method === 'POST') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const body = await req.json()
      
      // Always auto-create Stripe price - ignore any manually entered stripe_price_id
      // (admin form has a field but it should be auto-generated)
      delete body.stripe_price_id
      
      // Sync image_url with images array
      if (body.images && body.images.length > 0) {
        body.image_url = body.images[0]
      } else if (body.image_url && (!body.images || body.images.length === 0)) {
        body.images = [body.image_url]
      }
      
      const product: Product = {
        ...body,
        slug: slugify(body.name),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Create Stripe price automatically
      const stripePriceId = await createStripePrice(product)
      if (stripePriceId) {
        product.stripe_price_id = stripePriceId
      } else {
        console.error('WARNING: Failed to create Stripe price for product:', product.name)
      }

      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update product (admin only)
    if (path.startsWith('/api/products/') && method === 'PUT') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const productMatch = path.match(/^\/api\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)
      if (!productMatch) {
        return new Response(JSON.stringify({ error: 'Invalid product ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      const id = productMatch[1]
      const body = await req.json()

      // Remove any manually entered stripe_price_id from the request
      const manualStripeId = body.stripe_price_id
      delete body.stripe_price_id

      // Sync image_url with images array
      if (body.images && body.images.length > 0) {
        body.image_url = body.images[0]
      } else if (body.image_url && (!body.images || body.images.length === 0)) {
        body.images = [body.image_url]
      }

      // Fetch existing product to check if price changed
      const { data: existingProduct } = await supabase
        .from('products')
        .select('stripe_price_id, price')
        .eq('id', id)
        .single()

      // If price changed, archive old Stripe price and create new one
      if (existingProduct && body.price && body.price !== existingProduct.price) {
        if (existingProduct.stripe_price_id) {
          await updateStripePrice(existingProduct.stripe_price_id, body)
        }
        const newPriceId = await createStripePrice(body)
        if (newPriceId) {
          body.stripe_price_id = newPriceId
        }
      } else if (existingProduct && !existingProduct.stripe_price_id) {
        // Product has no Stripe price yet - create one
        const newPriceId = await createStripePrice({ ...existingProduct, ...body })
        if (newPriceId) {
          body.stripe_price_id = newPriceId
        }
      } else if (existingProduct?.stripe_price_id) {
        // Keep existing stripe_price_id if price didn't change
        body.stripe_price_id = existingProduct.stripe_price_id
      }

      const { data, error } = await supabase
        .from('products')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Delete product (admin only)
    if (path.startsWith('/api/products/') && method === 'DELETE') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const productMatch = path.match(/^\/api\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)
      if (!productMatch) {
        return new Response(JSON.stringify({ error: 'Invalid product ID' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      const id = productMatch[1]

      const { error } = await supabase
        .from('products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upload image (admin only)
    if (path === '/api/upload' && method === 'POST') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const formData = await req.formData()
      const file = formData.get('file') as File

      if (!file) {
        return new Response(JSON.stringify({ error: 'No file uploaded' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `products/${fileName}`

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          contentType: file.type,
        })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return new Response(JSON.stringify({ url: urlData.publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Orders endpoints
    if (path === '/api/orders' && method === 'GET') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch items for these orders
      const orderIds = ordersData?.map(o => o.id) || []
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)

      if (itemsError) throw itemsError

      // Map items back to orders
      const ordersWithItems = ordersData?.map(order => ({
        ...order,
        items: itemsData?.filter(item => item.order_id === order.id) || []
      }))

      return new Response(JSON.stringify(ordersWithItems || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update order status (admin only)
    if (path.startsWith('/api/orders/') && method === 'PUT') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const id = path.split('/').pop()
      const body = await req.json()

      const { data, error } = await supabase
        .from('orders')
        .update({
          status: body.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Checkout endpoint (public)
    if (path === '/checkout' && method === 'POST') {
      const body = await req.json()
      const { items, customer_email, shipping_details } = body as {
        items: CheckoutItem[]
        customer_email: string
        shipping_details?: {
          name: string
          address: string
          city: string
          postal_code: string
          country: string
        }
      }

      if (!items || !items.length || !customer_email) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Fetch products - support both UUID and slug lookups
      const productIds = items.map(i => i.product_id)
      
      // Check if any IDs look like slugs (not UUIDs)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const uuids = productIds.filter(id => uuidRegex.test(id))
      const slugs = productIds.filter(id => !uuidRegex.test(id))

      let products: any[] = []

      if (uuids.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .in('id', uuids)
        if (data) products = products.concat(data)
      }

      if (slugs.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .in('slug', slugs)
        if (data) products = products.concat(data)
      }

      if (!products || products.length === 0) {
        return new Response(JSON.stringify({ error: 'Products not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Calculate totals and validate stock
      let subtotal = 0
      const lineItems = []
      const orderItems: OrderItem[] = []

      for (const item of items) {
        const product = products.find(p => p.id === item.product_id || p.slug === item.product_id)
        if (!product || !product.stripe_price_id) continue

        // Validate stock quantity
        if (product.stock_quantity < item.quantity) {
          return new Response(JSON.stringify({ 
            error: `Nema dovoljno zaliha za: ${product.name}. Dostupno: ${product.stock_quantity}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const itemTotal = product.price * item.quantity
        subtotal += itemTotal

        lineItems.push({
          price: product.stripe_price_id,
          quantity: item.quantity,
        })

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: product.price,
          total_price: itemTotal,
        })
      }

      const shippingCost = subtotal > 50 ? 0 : 5
      const total = subtotal + shippingCost

      if (lineItems.length === 0) {
        return new Response(JSON.stringify({ error: 'No valid items' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create order object without items (they go to order_items table)
      // Format: BOD-YYMMDD-XXXX (max 20 chars)
      const now = new Date()
      const dateStr = now.toISOString().slice(2,10).replace(/-/g, '')
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
      const orderNumber = `BOD-${dateStr}-${rand}`
      
      const orderData = {
        order_number: orderNumber,
        customer_email,
        customer_name: shipping_details?.name,
        shipping_name: shipping_details?.name,
        shipping_address: shipping_details?.address,
        shipping_city: shipping_details?.city,
        shipping_postal_code: shipping_details?.postal_code,
        shipping_country: shipping_details?.country,
        status: 'pending',
        subtotal,
        shipping_cost: shippingCost,
        total,
      }

      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) {
        return new Response(JSON.stringify({ error: orderError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Insert order items
      const orderItemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: createdOrder.id,
      }))

      await supabase.from('order_items').insert(orderItemsWithOrderId)

      // Create Stripe Checkout Session
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (!stripeKey) {
        return new Response(JSON.stringify({ error: 'Payment processing not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const siteUrl = Deno.env.get('SITE_URL') || 'https://bodulica.pages.dev'

      const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: (() => {
          const params = new URLSearchParams()
          params.append('mode', 'payment')
          params.append('customer_email', customer_email)
          params.append('success_url', `${siteUrl}/index.html?checkout=success&order=${orderNumber}`)
          params.append('cancel_url', `${siteUrl}/index.html?checkout=cancel`)
          
          lineItems.forEach((item, i) => {
            params.append(`line_items[${i}][price]`, item.price)
            params.append(`line_items[${i}][quantity]`, String(item.quantity))
          })
          
          params.append('payment_method_types[0]', 'card')
          params.append('shipping_address_collection[allowed_countries][0]', 'HR')
          params.append('metadata[order_id]', createdOrder.id)
          params.append('metadata[order_number]', orderNumber)
          
          return params.toString()
        })(),
      })

      if (!sessionRes.ok) {
        const errorText = await sessionRes.text()
        console.error('Stripe session error:', errorText)
        return new Response(JSON.stringify({ error: 'Payment session creation failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const session = await sessionRes.json()

      // Update order with stripe session id
      await supabase
        .from('orders')
        .update({ stripe_session_id: session.id })
        .eq('id', createdOrder.id)

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Webhook for Stripe events
    if (path === '/webhook' && method === 'POST') {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

      if (!stripeKey || !webhookSecret) {
        return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const payload = await req.text()
      const signature = req.headers.get('stripe-signature')

      if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verify webhook signature using Stripe's expected format
      // Stripe signs with: t={timestamp},v1={signature}
      const timestamp = signature.split(',').find(s => s.startsWith('t='))?.split('=')[1]
      const signedPayload = signature.split(',').find(s => s.startsWith('v1='))?.split('=')[1]

      if (!timestamp || !signedPayload) {
        return new Response(JSON.stringify({ error: 'Invalid signature format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate timestamp (must be within 5 minutes)
      const now = Math.floor(Date.now() / 1000)
      const timestampInt = parseInt(timestamp, 10)
      if (Math.abs(now - timestampInt) > 300) {
        console.error('Webhook timestamp too old:', timestampInt, 'current:', now)
        return new Response(JSON.stringify({ error: 'Timestamp outside acceptable range' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verify the signature matches using global crypto API
      const encoder = new TextEncoder()
      const keyData = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      )

      const expectedSignature = await crypto.subtle.sign(
        'HMAC',
        keyData,
        encoder.encode(`${timestamp}.${payload}`)
      )

      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      if (expectedHex !== signedPayload) {
        console.error('Webhook signature verification failed')
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Parse and handle the event
      let event
      try {
        event = JSON.parse(payload)
      } catch (parseError) {
        console.error('Failed to parse webhook payload:', parseError)
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        const orderId = session.metadata?.order_id

        if (orderId) {
          await supabase
            .from('orders')
            .update({
              status: 'paid',
              stripe_payment_intent_id: session.payment_intent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)

          // Decrease stock for unique items
          const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('*, product:products(*)')
            .eq('order_id', orderId)

          if (itemsError) {
            console.error('Error fetching order items:', itemsError)
          } else {
            for (const item of (orderItems || [])) {
              if (item.product?.is_unique) {
                const { error: updateError } = await supabase
                  .from('products')
                  .update({ is_active: false, stock_quantity: 0 })
                  .eq('id', item.product_id)
                
                if (updateError) {
                  console.error('Error updating unique product:', updateError)
                }
              } else {
                const { error: rpcError } = await supabase.rpc('decrement_stock', {
                  product_id: item.product_id,
                  quantity: item.quantity,
                })
                
                if (rpcError) {
                  console.error('Error decrementing stock:', rpcError)
                }
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Server error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
