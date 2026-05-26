import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PRIVATE_DATABASE_URL || process.env.DATABASE_URL
});

async function seed() {
  try {
    console.log("Seeding database...");

    // Seed Ads
    const ads = [
      { id: '1', src: '/ads/ad_jinro.png', alt: 'Jinro Soju - Limited Offer 13,000 TZS', order: 0 },
      { id: '2', src: '/ads/ad_hennessy.png', alt: 'Hennessy - Never Stop. Never Settle.', order: 1 },
      { id: '3', src: '/ads/ad_heineken.png', alt: 'Heineken - Cold, Crispy Delivered in 30 Minutes', order: 2 },
      { id: '4', src: '/ads/ad_kwv.png', alt: 'KWV Classic Collection - Starting from 34,000 TZS', order: 3 },
    ];
    for (const ad of ads) {
      await pool.query(
        'INSERT INTO ads (id, src, alt, "order") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET src = $2, alt = $3, "order" = $4',
        [ad.id, ad.src, ad.alt, ad.order]
      );
    }

    // Seed Vehicles (Trucks)
    const vehicles = [
      { id: 'mini', name: 'Mini Pickup', capacity: 'Up to 10 ctn', price: '5,000', time: '15 min', icon: '🛻' },
      { id: 'light', name: 'Light Truck', capacity: '10 - 50 ctn', price: '15,000', time: '25 min', icon: '🚚' },
      { id: 'heavy', name: 'Heavy Truck', capacity: '50+ ctn', price: '35,000', time: '40 min', icon: '🚛' },
    ];
    for (const v of vehicles) {
      await pool.query(
        'INSERT INTO vehicles (id, name, capacity, price, time, icon) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name = $2, capacity = $3, price = $4, time = $5, icon = $6',
        [v.id, v.name, v.capacity, v.price, v.time, v.icon]
      );
    }

    // Seed Payment Methods
    const paymentMethods = [
      { id: 'cash', name: 'Cash', icon: '💵', color: '' },
      { id: 'card', name: 'Card', icon: '💳', color: '' },
      { id: 'mpesa', name: 'M-Pesa', icon: '📱', color: 'bg-red-600' },
      { id: 'tigopesa', name: 'Tigo Pesa', icon: '📱', color: 'bg-blue-600' },
      { id: 'airtelmoney', name: 'Airtel Money', icon: '📱', color: 'bg-red-500' },
    ];
    for (const pm of paymentMethods) {
      await pool.query(
        'INSERT INTO payment_methods (id, name, icon, color) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, icon = $3, color = $4',
        [pm.id, pm.name, pm.icon, pm.color]
      );
    }

    // Seed Quick Actions
    const quickActions = [
      { id: '1', icon_name: 'GlassWater', label: 'Events', order: 0 },
      { id: '2', icon_name: 'Share2', label: 'Affiliate', order: 1 },
      { id: '3', icon_name: 'Ticket', label: 'Ticket', order: 2 },
    ];
    for (const qa of quickActions) {
      await pool.query(
        'INSERT INTO quick_actions (id, icon_name, label, "order") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET icon_name = $2, label = $3, "order" = $4',
        [qa.id, qa.icon_name, qa.label, qa.order]
      );
    }

    // Seed Categories
    const categories = [
      { id: 'Beer', name: 'BEER', image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=500&fit=crop', order: 0 },
      { id: 'Whiskey', name: 'WHISKEY', image: 'https://images.unsplash.com/photo-1527281400828-ac737aefa5ad?w=400&h=500&fit=crop', order: 1 },
      { id: 'Gin', name: 'GIN', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=500&fit=crop', order: 2 },
      { id: 'Soda', name: 'SODA', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=500&fit=crop', order: 3 },
    ];
    for (const cat of categories) {
      await pool.query(
        'INSERT INTO categories (id, name, image, "order") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, image = $3, "order" = $4',
        [cat.id, cat.name, cat.image, cat.order]
      );
    }

    console.log("Database seeded successfully!");

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await pool.end();
  }
}

seed();
