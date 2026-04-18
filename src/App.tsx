/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { apiService } from './services/apiService';
import { auth } from './firebase';

const LIBRARIES: ("places")[] = ["places"];

// import { CATEGORIES } from './categories';
// ... existing imports ...
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Home, ShoppingCart, User, Package, Search, Plus, Truck, Store, Trash2, ArrowLeft, MapPin, Clock, Info, ChevronLeft, ChevronRight, ChevronDown, X, Phone, MessageSquare, Navigation, MessageCircle, Send, Bot, User as UserIcon, Camera, Image as ImageIcon, Paperclip, Edit2, Barcode, Scan, Flashlight, FlashlightOff, Calculator, TrendingUp, DollarSign, AlertTriangle, BarChart3, Settings, Users, Upload, PackagePlus, FileText, Calendar, Shield, ExternalLink, Check, ShoppingBag, GlassWater, Share2, Ticket, Beer, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer, Autocomplete, Libraries } from '@react-google-maps/api';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Expense = {
  id: string;
  companyId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMode?: string;
};

type CartItem = { id: number; productId: string; name: string; price: number; isWholesale: boolean; quantity: number };
type Customer = {
  id: string;
  companyId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};
type Batch = {
  id: string;
  batchNumber: string;
  expiryDate: string;
  stock: number; // in pieces
  buyingPricePerCarton: number;
  costPrice: number; // in pieces
  dateAdded: string;
};

type Product = { 
  id: string;
  companyId: string;
  name: string; 
  retailPrice: number; 
  wholesalePrice: number; 
  costPrice: number;
  buyingPricePerCarton: number;
  margin: number;
  wholesaleMargin: number;
  wholesaleUnitSize: number;
  numCartons?: number;
  image: string; 
  category: string;
  stock: number;
  discount: string;
  barcode?: string;
  expiryDate?: string;
  batchNumber?: string;
  reorderLevel: number;
  batches: Batch[];
  featured?: boolean;
};
type UserProfile = { 
  uid: string;
  email: string; 
  password?: string;
  name: string; 
  role: 'client' | 'manager';
  companyId?: string; // For clients to know which company they are visiting
  phone?: string;
  businessName?: string;
  address?: string;
  tinNumber?: string;
  cityState?: string;
  postalCode?: string;
  isVatApplicable?: boolean;
  vatRate?: number;
  includeReceivableInRevenue?: boolean;
};
type Sale = {
  id: string;
  companyId: string;
  productId: string;
  productName: string;
  quantity: number; // in pieces
  type: 'retail' | 'wholesale';
  salePrice: number;
  costPrice: number;
  timestamp: string;
  discountAmount?: number;
  discountType?: 'percentage' | 'flat';
  batchId?: string;
  paymentMode?: string;
  orderId?: string;
};
type OrderActivity = {
  id: string;
  status: 'Delivered' | 'On the way' | 'Pending';
  date: string;
  items: { name: string; quantity: number; price: string }[];
  totalPrice: string;
  deliveryAddress: string;
  vehicle: string;
  driverName: string;
  vehicleNumber: string;
  timeline: { status: string; time: string; description: string; completed: boolean }[];
};

type CompanyInfo = {
  name: string;
  address: string;
  cityState: string;
  postalCode: string;
  email: string;
  isVatApplicable: boolean;
  vatRate: number;
};

type Vendor = {
  id: string;
  companyId: string;
  name: string;
  address: string;
  cityState: string;
  postalCode: string;
  phone: string;
  email: string;
};

type PurchaseOrderItem = {
  productId: string;
  productName: string;
  quantity: number; // in cartons
  unitSize: number; // pcs per carton
  costPricePerCarton: number;
  receivedQuantity?: number; // in cartons
};

type PurchaseOrder = {
  id: string;
  vendorId: string;
  vendorName: string;
  date: string;
  items: PurchaseOrderItem[];
  status: 'Pending' | 'Received';
  totalAmount: number;
};

type Order = {
  id: string;
  companyId: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  transportCost: number;
  discountAmount: number;
  discountType: 'percentage' | 'flat';
  totalCost: number;
  status: 'Pending' | 'Processing' | 'On the way' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Paid' | 'Failed';
  paymentMode?: string;
  driverName: string;
  destinationAddress: string;
  timestamp: string;
  vehicle: string;
};

const INITIAL_PRODUCTS: Product[] = [
  { 
    id: '1', 
    companyId: 'system',
    name: "Kilimanjaro Lager", 
    retailPrice: 2500, 
    wholesalePrice: 22000, 
    costPrice: 1800, 
    buyingPricePerCarton: 21600, 
    margin: 38.88, 
    wholesaleMargin: 1.85, 
    wholesaleUnitSize: 12, 
    image: "https://picsum.photos/seed/kili/300/300", 
    category: "Beer > Local Beers", 
    stock: 150, 
    discount: "15% OFF", 
    featured: true,
    expiryDate: "2026-06-15", 
    batchNumber: "B-2024-001",
    reorderLevel: 24,
    batches: [
      { id: 'b1', batchNumber: "B-2024-001", expiryDate: "2026-06-15", stock: 150, buyingPricePerCarton: 21600, costPrice: 1800, dateAdded: "2024-01-01" }
    ]
  },
  { 
    id: 'beer-2', 
    companyId: 'system',
    name: "Serengeti Lite", 
    retailPrice: 2500, 
    wholesalePrice: 21500, 
    costPrice: 1750, 
    buyingPricePerCarton: 21000, 
    margin: 42.85, 
    wholesaleMargin: 2.38, 
    wholesaleUnitSize: 12, 
    image: "https://picsum.photos/seed/serengeti/300/300", 
    category: "Beer > Local Beers", 
    stock: 200, 
    discount: null, 
    expiryDate: "2026-08-10", 
    batchNumber: "B-2024-005",
    reorderLevel: 48,
    batches: [{ id: 'b5', batchNumber: "B-2024-005", expiryDate: "2026-08-10", stock: 200, buyingPricePerCarton: 21000, costPrice: 1750, dateAdded: "2024-01-05" }]
  },
  { 
    id: 'beer-3', 
    companyId: 'system',
    name: "Safari Lager", 
    retailPrice: 2800, 
    wholesalePrice: 24000, 
    costPrice: 2000, 
    buyingPricePerCarton: 24000, 
    margin: 40, 
    wholesaleMargin: 0, 
    wholesaleUnitSize: 12, 
    image: "https://picsum.photos/seed/safari/300/300", 
    category: "Beer > Local Beers", 
    stock: 120, 
    discount: "Buy 10 Get 1", 
    expiryDate: "2026-07-20", 
    batchNumber: "B-2024-006",
    reorderLevel: 24,
    batches: [{ id: 'b6', batchNumber: "B-2024-006", expiryDate: "2026-07-20", stock: 120, buyingPricePerCarton: 24000, costPrice: 2000, dateAdded: "2024-01-05" }]
  },
  { 
    id: 'beer-4', 
    companyId: 'system',
    name: "Heineken 330ml", 
    retailPrice: 4500, 
    wholesalePrice: 48000, 
    costPrice: 3500, 
    buyingPricePerCarton: 42000, 
    margin: 28.57, 
    wholesaleMargin: 14.28, 
    wholesaleUnitSize: 12, 
    image: "https://picsum.photos/seed/heineken/300/300", 
    category: "Beer > Imported Beers", 
    stock: 80, 
    discount: null, 
    expiryDate: "2026-11-30", 
    batchNumber: "B-2024-007",
    reorderLevel: 12,
    batches: [{ id: 'b7', batchNumber: "B-2024-007", expiryDate: "2026-11-30", stock: 80, buyingPricePerCarton: 42000, costPrice: 3500, dateAdded: "2024-01-10" }]
  },
  { 
    id: 'beer-5', 
    companyId: 'system',
    name: "Savanna Dry", 
    retailPrice: 5000, 
    wholesalePrice: 55000, 
    costPrice: 3800, 
    buyingPricePerCarton: 45600, 
    margin: 31.57, 
    wholesaleMargin: 20.61, 
    wholesaleUnitSize: 12, 
    image: "https://picsum.photos/seed/savanna/300/300", 
    category: "Beer > Malts n Ciders", 
    stock: 65, 
    discount: "LIMITED", 
    expiryDate: "2026-09-15", 
    batchNumber: "B-2024-008",
    reorderLevel: 12,
    batches: [{ id: 'b8', batchNumber: "B-2024-008", expiryDate: "2026-09-15", stock: 65, buyingPricePerCarton: 45600, costPrice: 3800, dateAdded: "2024-01-15" }]
  },
  { 
    id: '2', 
    companyId: 'system',
    name: "Coca-Cola 500ml", 
    retailPrice: 1200, 
    wholesalePrice: 10000, 
    costPrice: 800, 
    buyingPricePerCarton: 9600, 
    margin: 50, 
    wholesaleMargin: 4.17, 
    wholesaleUnitSize: 12, 
    image: "https://picsum.photos/seed/soda/300/300", 
    category: "Soft Drink", 
    stock: 500, 
    discount: "5% OFF", 
    expiryDate: "2026-12-20", 
    batchNumber: "B-2024-002",
    reorderLevel: 120,
    batches: [
      { id: 'b2', batchNumber: "B-2024-002", expiryDate: "2026-12-20", stock: 500, buyingPricePerCarton: 9600, costPrice: 800, dateAdded: "2024-01-01" }
    ]
  },
  { 
    id: '3', 
    companyId: 'system',
    name: "Konyagi 250ml", 
    retailPrice: 4000, 
    wholesalePrice: 35000, 
    costPrice: 3000, 
    buyingPricePerCarton: 36000, 
    margin: 33.33, 
    wholesaleMargin: -2.78, 
    wholesaleUnitSize: 12, 
    image: "https://picsum.photos/seed/liquor/300/300", 
    category: "Liquor", 
    stock: 85, 
    discount: "10% OFF", 
    expiryDate: "2027-01-10", 
    batchNumber: "B-2024-003",
    reorderLevel: 50,
    batches: [
      { id: 'b3', batchNumber: "B-2024-003", expiryDate: "2027-01-10", stock: 85, buyingPricePerCarton: 36000, costPrice: 3000, dateAdded: "2024-01-01" }
    ]
  },
  { 
    id: '4', 
    companyId: 'system',
    name: "Dodoma Wine", 
    retailPrice: 15000, 
    wholesalePrice: 120000, 
    costPrice: 10000, 
    buyingPricePerCarton: 120000, 
    margin: 50, 
    wholesaleMargin: 0, 
    wholesaleUnitSize: 12, 
    image: "https://picsum.photos/seed/wine/300/300", 
    category: "Wine", 
    stock: 40, 
    discount: "20% OFF", 
    expiryDate: "2026-05-01", 
    batchNumber: "B-2024-004",
    reorderLevel: 12,
    batches: [
      { id: 'b4', batchNumber: "B-2024-004", expiryDate: "2026-05-01", stock: 40, buyingPricePerCarton: 120000, costPrice: 10000, dateAdded: "2024-01-01" }
    ]
  },
];

const CATEGORIES = {
  'Beer': ['Local Beers', 'Imported Beers', 'Malts n Ciders'],
  'Spirits': ['Whiskey', 'Tequila', 'Cognac', 'Vodka', 'Gin', 'Liqueurs', 'Rum'],
  'Red Wines': ['Premium Red', 'Red Blends', 'Cabernet Sauvignon', 'Pinot Noir & Pinotage', 'Malbec & Merlot', 'Rosé'],
  'White Wines': ['Premium Whites', 'White Blends', 'Chardonnay', 'Sauvignon & Chenin Blanc', 'Moscato'],
  'Bubbles': ['Sparkling Wine', 'Champagne', 'Non Alcoholic'],
  'Soft Drinks': ['Juices & Energy Drinks', 'Sodas & Water'],
  'Extras': ['Smoke Shop', 'Snacks', 'Party Essential', 'Self Care'],
  'Hampers & Gifts': ['Hampers', 'Drink Combo\'s']
};

const CalcInput = ({ value, onChange, className, placeholder, required }: any) => {
  const [localValue, setLocalValue] = useState((value ?? '').toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue((value ?? '').toString());
  }, [value]);

  const evaluate = (expr: string) => {
    if (!expr || expr.trim() === '') return 0;
    try {
      // Replace × with * for evaluation
      const cleanExpr = expr.replace(/×/g, '*');
      // Basic safety check: only allow numbers and operators
      if (!/^[0-9+\-*/.*() ]+$/.test(cleanExpr)) return value;
      
      // Use Function constructor for simple evaluation
      const result = new Function(`return ${cleanExpr}`)();
      return isFinite(result) ? Math.round(result * 100) / 100 : value;
    } catch (e) {
      return value;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if the new focus target is one of our buttons
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest('.calc-toolbar')) {
      return;
    }
    const result = evaluate(localValue);
    setLocalValue((result ?? '').toString());
    onChange(result);
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const result = evaluate(localValue);
      setLocalValue((result ?? '').toString());
      onChange(result);
      inputRef.current?.blur();
    }
  };

  const addChar = (char: string) => {
    setLocalValue(prev => prev + char);
    inputRef.current?.focus();
  };

  const clear = () => {
    setLocalValue('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#0077B6] transition-colors">
        <Calculator size={16} />
      </div>
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        required={required}
        className={`${className} pl-10`}
        value={localValue}
        placeholder={placeholder}
        onChange={e => {
          const val = e.target.value.replace(/[^0-9+\-*/.×() ]/g, '');
          setLocalValue(val);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <AnimatePresence>
        {isFocused && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="calc-toolbar absolute -top-12 left-0 right-0 bg-[#1E293B] border border-gray-700 rounded-xl p-1 flex gap-1 z-10 shadow-2xl"
          >
            {['+', '-', '×', '/', '.', '(', ')'].map(op => (
              <button
                key={op}
                type="button"
                onClick={() => addChar(op)}
                className="flex-1 bg-[#0B172A] text-white py-2 rounded-lg font-bold hover:bg-[#0077B6] transition-colors text-sm"
              >
                {op}
              </button>
            ))}
            <button
              type="button"
              onClick={clear}
              className="flex-1 bg-red-500/20 text-red-500 py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-colors text-sm"
            >
              C
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TRUCKS = [
  { id: 'mini', name: 'Mini Pickup', capacity: 'Up to 10 ctn', price: '5,000', time: '15 min', icon: '🛻' },
  { id: 'light', name: 'Light Truck', capacity: '10 - 50 ctn', price: '15,000', time: '25 min', icon: '🚚' },
  { id: 'heavy', name: 'Heavy Truck', capacity: '50+ ctn', price: '35,000', time: '40 min', icon: '🚛' },
];

const ADDRESSES = [
  { id: 1, name: 'Work', address: 'Anasel Security Limited, Mbaraka Mwinshehe Road, Dar es Salaam', distance: '9.9 km', lat: -6.7824, lng: 39.2183 },
  { id: 2, name: 'Home', address: '33 Yolandi Street, Dar es Salaam', distance: '20.5 km', lat: -6.8124, lng: 39.2583 },
  { id: 3, name: 'Warehouse', address: 'SALASALA kwa Mama ISACK, Dar es Salaam', distance: '8.0 km', lat: -6.7424, lng: 39.1883 },
];

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', icon: '💵' },
  { id: 'card', name: 'Card', icon: '💳' },
  { id: 'mpesa', name: 'M-Pesa', icon: '📱', color: 'bg-red-600' },
  { id: 'tigopesa', name: 'Tigo Pesa', icon: '📱', color: 'bg-blue-600' },
  { id: 'airtelmoney', name: 'Airtel Money', icon: '📱', color: 'bg-red-500' },
];

const RECENT_ACTIVITIES: OrderActivity[] = [
  {
    id: '1234',
    status: 'Delivered',
    date: 'Oct 24, 2023',
    items: [
      { name: 'Kilimanjaro Lager', quantity: 5, price: '22,000' },
      { name: 'Coca-Cola 500ml', quantity: 2, price: '10,000' }
    ],
    totalPrice: '130,000',
    deliveryAddress: 'Anasel Security Limited, Mbaraka Mwinshehe Road, Dar es Salaam',
    vehicle: 'Light Truck',
    driverName: 'John Doe',
    vehicleNumber: 'T 456 DEF',
    timeline: [
      { status: 'Order Placed', time: '09:00 AM', description: 'Order received and confirmed', completed: true },
      { status: 'Processing', time: '10:30 AM', description: 'Items packed and ready', completed: true },
      { status: 'On the way', time: '11:45 AM', description: 'Driver is heading to your location', completed: true },
      { status: 'Delivered', time: '01:20 PM', description: 'Package handed over to customer', completed: true }
    ]
  },
  {
    id: '5678',
    status: 'On the way',
    date: 'Oct 25, 2023',
    items: [
      { name: 'Konyagi 250ml', quantity: 10, price: '35,000' }
    ],
    totalPrice: '350,000',
    deliveryAddress: '33 Yolandi Street, Dar es Salaam',
    vehicle: 'Heavy Truck',
    driverName: 'Hamisi Juma',
    vehicleNumber: 'T 123 ABB',
    timeline: [
      { status: 'Order Placed', time: '08:15 AM', description: 'Order received and confirmed', completed: true },
      { status: 'Processing', time: '09:45 AM', description: 'Items packed and ready', completed: true },
      { status: 'On the way', time: '11:00 AM', description: 'Driver is heading to your location', completed: true },
      { status: 'Arriving Soon', time: '12:45 PM', description: 'Driver is 5 mins away', completed: false }
    ]
  }
];

const ProductCard: React.FC<{ product: Product; isWholesale: boolean; onAddToCart: (item: Omit<CartItem, 'id'>) => void }> = ({ product, isWholesale, onAddToCart }) => {
  const price = isWholesale ? product.wholesalePrice : product.retailPrice;

  return (
    <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50 group active:scale-[0.98] transition-all">
      <div className="relative aspect-square">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          referrerPolicy="no-referrer" 
        />
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart({ 
              productId: product.id,
              name: product.name, 
              price: price, 
              isWholesale 
            });
          }}
          className="absolute top-3 right-3 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:rotate-90 transition-all"
        >
          <Plus size={24} strokeWidth={3} />
        </button>

        {product.discount && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-lg">
            {product.discount}
          </div>
        )}
      </div>

      <div className="p-4 space-y-1">
        <h3 className="text-sm font-bold text-gray-900 truncate">{product.name}</h3>
        <p className="text-xs text-gray-400 font-medium">1 Bottle (500ml)</p>
        <div className="pt-2 flex items-baseline gap-1">
          <span className="text-[10px] font-bold text-primary">TSh</span>
          <p className="text-lg font-black text-gray-900 tracking-tight">
            {price.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const FinancialDetailModal = ({ isOpen, onClose, type, data, user, onUpdateUser }: { isOpen: boolean; onClose: () => void; type: 'profit' | 'expenses' | 'revenue' | 'stock' | 'inventory_asset' | 'accounts'; data: any; user?: UserProfile; onUpdateUser?: (data: Partial<UserProfile>) => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#1E293B] w-full max-w-lg rounded-[32px] border border-gray-800 overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0B172A]">
          <h3 className="text-xl font-bold text-white capitalize">{type.replace('_', ' ')} Detail</h3>
          <button onClick={onClose} className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {type === 'profit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Gross Revenue</p>
                  <p className="font-bold text-white">TSh {(data.revenue || 0).toLocaleString()}</p>
                </div>
                {data.vatApplicable && (
                  <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">{data.vatRate}% VAT</p>
                    <p className="font-bold text-red-400">-TSh {(data.vat || 0).toLocaleString()}</p>
                  </div>
                )}
                <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">FIFO COGS</p>
                  <p className="font-bold text-red-400">-TSh {(data.cogs || 0).toLocaleString()}</p>
                </div>
                <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">OPEX</p>
                  <p className="font-bold text-red-400">-TSh {(data.opex || 0).toLocaleString()}</p>
                </div>
                <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Expired Products</p>
                  <p className="font-bold text-red-400">-TSh {(data.expiredCost || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
                <p className="text-xs text-green-500 font-bold uppercase tracking-widest mb-1">Net Profit (Final)</p>
                <p className="text-3xl font-black text-green-400">TSh {(data.netProfit || 0).toLocaleString()}</p>
              </div>
            </div>
          )}

          {type === 'inventory_asset' && (
            <div className="space-y-4">
              <div className="bg-[#0B172A] p-6 rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Inventory Value</p>
                <p className="text-3xl font-black text-white">TSh {(data.value || 0).toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 mt-2">Calculated as: Current Stock × Cost Price</p>
              </div>
              
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Asset Breakdown</h4>
              <div className="space-y-2">
                {data.products.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center bg-[#0B172A] p-4 rounded-2xl border border-gray-800/50">
                    <div>
                      <p className="font-bold text-white text-sm">{p.name}</p>
                      <p className="text-[10px] text-gray-500">{p.stock} units @ TSh {(p.costPrice || 0).toLocaleString()}</p>
                    </div>
                    <p className="font-black text-white text-sm">TSh {(p.stock * p.costPrice).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'accounts' && (
            <div className="space-y-4">
              <div className="bg-[#0B172A] p-6 rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Cash & Bank</p>
                <p className={`text-3xl font-black ${data.total >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  TSh {(data.total || 0).toLocaleString()}
                </p>
              </div>
              
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Account Balances</h4>
              <div className="space-y-2">
                {Object.entries(data.balances).map(([account, balance]: [string, any]) => (
                  <div key={account} className="flex justify-between items-center bg-[#0B172A] p-4 rounded-2xl border border-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                        <DollarSign size={18} />
                      </div>
                      <p className="font-bold text-white">{account}</p>
                    </div>
                    <p className={`font-black text-sm ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                      TSh {balance.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'expenses' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Top Expense Categories</h4>
              <div className="space-y-2">
                {data.categories.map((cat: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-[#0B172A] p-4 rounded-2xl border border-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                        <ArrowLeft size={18} className="rotate-45" />
                      </div>
                      <p className="font-bold text-white">{cat.name}</p>
                    </div>
                    <p className="font-black text-white">TSh {(cat.amount || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'revenue' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mb-1">Cash in Hand</p>
                  <p className="text-xl font-black text-green-400">TSh {(data.cash || 0).toLocaleString()}</p>
                </div>
                <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20">
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">Mobile Money</p>
                  <p className="text-xl font-black text-blue-400">TSh {(data.mobile || 0).toLocaleString()}</p>
                </div>
                <div className="bg-purple-500/10 p-6 rounded-2xl border border-purple-500/20">
                  <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest mb-1">Card / Bank</p>
                  <p className="text-xl font-black text-purple-400">TSh {(data.card || 0).toLocaleString()}</p>
                </div>
                <div className="bg-orange-500/10 p-6 rounded-2xl border border-orange-500/20 relative group">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Accounts Receivable</p>
                    {onUpdateUser && user && (
                      <button 
                        onClick={() => onUpdateUser({ includeReceivableInRevenue: !user.includeReceivableInRevenue })}
                        className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${user.includeReceivableInRevenue ? 'bg-orange-500' : 'bg-gray-700'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${user.includeReceivableInRevenue ? 'left-[18px]' : 'left-[2px]'}`} />
                      </button>
                    )}
                  </div>
                  <p className="text-xl font-black text-orange-400">TSh {(data.credit || 0).toLocaleString()}</p>
                  <p className="text-[8px] text-orange-500/50 mt-1 font-bold uppercase tracking-tighter">
                    {user?.includeReceivableInRevenue ? 'Included in Gross Revenue' : 'Excluded from Gross Revenue'}
                  </p>
                </div>
              </div>
              <div className="bg-[#0B172A] p-6 rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Gross Revenue</p>
                <p className="text-2xl font-black text-white">TSh {(data.total || 0).toLocaleString()}</p>
              </div>
            </div>
          )}

          {type === 'stock' && (
            <div className="space-y-4">
              <div className="bg-[#0B172A] p-6 rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Inventory Value (Cost)</p>
                <p className="text-2xl font-black text-white">TSh {data.value.toLocaleString()}</p>
              </div>
              <div className="bg-[#0B172A] p-6 rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Low Stock Items</p>
                <p className="text-2xl font-black text-orange-400">{data.lowStockCount}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const PermissionBanner = () => {
  const [show, setShow] = useState(false);
  const [permissions, setPermissions] = useState({ camera: 'prompt', location: 'prompt' });

  useEffect(() => {
    // Check if we've already asked in this session
    const hasAsked = sessionStorage.getItem('permissionAsked');
    if (!hasAsked) {
      setShow(true);
    }

    // Attempt to check status if API is available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as any }).then(res => {
        setPermissions(prev => ({ ...prev, camera: res.state }));
      }).catch(() => {});
      
      navigator.permissions.query({ name: 'geolocation' }).then(res => {
        setPermissions(prev => ({ ...prev, location: res.state }));
      }).catch(() => {});
    }
  }, []);

  if (!show || (permissions.camera === 'granted' && permissions.location === 'granted')) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-[#0077B6]/10 border border-[#0077B6]/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-lg"
    >
      <div className="bg-[#0077B6]/20 p-3 rounded-xl text-[#0077B6] shrink-0">
        <Shield size={24} />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h4 className="text-sm font-bold text-white">Enable Device Features</h4>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          For the best experience, please enable camera for barcode scanning and location for delivery tracking.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={() => {
            setShow(false);
            sessionStorage.setItem('permissionAsked', 'true');
          }}
          className="px-4 py-2 text-[11px] font-bold text-gray-500 hover:text-white transition-colors"
        >
          Later
        </button>
        <button 
          onClick={async () => {
            try {
              // Request both
              const camPromise = navigator.mediaDevices.getUserMedia({ video: true })
                .then(s => { s.getTracks().forEach(t => t.stop()); return true; })
                .catch(() => false);
              
              const locPromise = new Promise(resolve => {
                navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false));
              });

              await Promise.all([camPromise, locPromise]);
              setShow(false);
              sessionStorage.setItem('permissionAsked', 'true');
            } catch (e) {
              setShow(false);
            }
          }}
          className="px-4 py-2 bg-[#0077B6] text-white rounded-xl text-[11px] font-bold hover:bg-[#005f8a] transition-all shadow-lg shadow-[#0077B6]/20"
        >
          Grant Access
        </button>
      </div>
    </motion.div>
  );
};

const UserGuideBanner = ({ title, description, role }: { title: string, description: string, role?: 'manager' | 'client' }) => {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible) return null;
  
  const isManager = role === 'manager';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-lg ${
        isManager 
          ? 'bg-[#0077B6]/10 border-[#0077B6]/20 text-[#0077B6]' 
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
      }`}
    >
      <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isManager ? 'text-[#00B4D8]' : 'text-emerald-400'}`} />
      <div className="flex-grow">
        <h4 className={`font-semibold text-sm mb-1 ${isManager ? 'text-[#00B4D8]' : 'text-emerald-400'}`}>{title}</h4>
        <p className={`text-sm leading-relaxed ${isManager ? 'text-[#00B4D8]/80' : 'text-emerald-400/80'}`}>{description}</p>
      </div>
      <button 
        onClick={() => setIsVisible(false)} 
        className={`transition-colors ${isManager ? 'text-[#00B4D8]/50 hover:text-[#00B4D8]' : 'text-emerald-400/50 hover:text-emerald-400'}`}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

const CLIENT_CATEGORIES = [
  { 
    id: 'Beer', 
    name: 'BEERS', 
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=85&auto=format&fit=crop'
  },
  { 
    id: 'Spirits', 
    name: 'SPIRITS', 
    image: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&q=85&auto=format&fit=crop'
  },
  { 
    id: 'Red Wines', 
    name: 'RED WINES', 
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=85&auto=format&fit=crop'
  },
  { 
    id: 'White Wines', 
    name: 'WHITE WINES', 
    image: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=600&q=85&auto=format&fit=crop'
  },
  { 
    id: 'Bubbles', 
    name: 'BUBBLES', 
    image: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=85&auto=format&fit=crop'
  },
  { 
    id: 'Soft Drinks', 
    name: 'SOFT DRINKS', 
    image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=600&q=85&auto=format&fit=crop'
  },
  { 
    id: 'Extras', 
    name: 'EXTRAS', 
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=85&auto=format&fit=crop'
  },
  { 
    id: 'Hampers & Gifts', 
    name: 'HAMPERS & GIFTS', 
    image: 'https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=85&auto=format&fit=crop'
  },
];

const Carousel = () => {
  const [current, setCurrent] = useState(0);
  const slides = [
    { src: '/ads/ad_jinro.png', alt: 'Jinro Soju - Limited Offer 13,000 TZS' },
    { src: '/ads/ad_hennessy.png', alt: 'Hennessy - Never Stop. Never Settle.' },
    { src: '/ads/ad_heineken.png', alt: 'Heineken - Cold, Crispy Delivered in 30 Minutes' },
    { src: '/ads/ad_kwv.png', alt: 'KWV Classic Collection - Starting from 34,000 TZS' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative w-full aspect-[21/9] bg-gray-900 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img 
            key={current}
            src={slides[current].src}
            alt={slides[current].alt}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        {/* Slide indicator dots overlaid bottom-right */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`transition-all rounded-full ${i === current ? 'w-5 h-1.5 bg-orange-500' : 'w-1.5 h-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const QuickActions = () => {
  const actions = [
    { icon: <GlassWater size={32} strokeWidth={1.5} />, label: 'Events' },
    { icon: <Share2 size={32} strokeWidth={1.5} />, label: 'Affiliate' },
    { icon: <Ticket size={32} strokeWidth={1.5} />, label: 'Ticket' },
  ];

  return (
    <div className="flex px-6 gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {actions.map((action, i) => (
        <button key={i} className="flex-1 min-w-[100px] flex flex-col items-center justify-center gap-3 py-6 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-all">
          <div className="text-orange-400">
            {action.icon}
          </div>
          <span className="text-sm font-bold text-gray-900">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

const HomeTab = ({ user, setUser, products, sales, expenses, orders, setShowSettingsModal, addToCart }: { user: UserProfile | null; setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>; products: Product[]; sales: Sale[]; expenses: Expense[]; orders: Order[]; setShowSettingsModal: (show: boolean) => void; addToCart: (item: any) => void }) => {
  const navigate = useNavigate();

  const handleProductAdd = (item: any) => {
    addToCart(item);
  };

  return (
    <div className="space-y-6 pb-32 bg-gray-50 min-h-screen">
      <Carousel />
      <QuickActions />
      
      <div className="px-6 space-y-4 pt-2">
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">SHOP FOR</h2>

        <div className="grid grid-cols-2 gap-4">
          {CLIENT_CATEGORIES.map((cat) => (
            <motion.button 
              key={cat.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/products?category=${cat.id}`)}
              className="relative aspect-[4/5] rounded-[20px] overflow-hidden group shadow-sm bg-white border border-gray-100"
            >
              <img src={cat.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
              <div className="absolute bottom-3 left-3 text-left">
                <span className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold tracking-wide shadow-md">
                  {cat.name}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {CLIENT_CATEGORIES.map(cat => {
        const categoryProducts = products.filter(p => p.category === cat.id || (p.category && p.category.startsWith(`${cat.id} > `)));
        if (categoryProducts.length === 0) return null;

        return (
          <div key={cat.id} className="bg-white">
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <h3 className="text-[24px] font-[900] text-black tracking-tight">{cat.name}</h3>
              <span 
                onClick={() => navigate(`/products?category=${cat.id}`)}
                className="text-[17px] text-[#111111] font-bold cursor-pointer hover:opacity-70"
              >
                View All
              </span>
            </div>
            <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full snap-x snap-mandatory border-t border-gray-100">
              {categoryProducts.slice(0, 10).map(p => (
                <HorizontalProductCard key={p.id} product={p} onAddToCart={handleProductAdd} />
              ))}
            </div>
          </div>
        );
      })}

      {(() => {
        const matchedProductIds = new Set();
        CLIENT_CATEGORIES.forEach(cat => {
          products.forEach(p => {
            if (p.category === cat.id || (p.category && p.category.startsWith(`${cat.id} > `))) {
              matchedProductIds.add(p.id);
            }
          });
        });
        const unclassifiedProducts = products.filter(p => !matchedProductIds.has(p.id));
        if (unclassifiedProducts.length === 0) return null;

        return (
          <div key="unclassified" className="bg-white">
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <h3 className="text-[24px] font-[900] text-black tracking-tight">OTHERS</h3>
            </div>
            <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full snap-x snap-mandatory border-t border-gray-100">
              {unclassifiedProducts.slice(0, 10).map(p => (
                <HorizontalProductCard key={p.id} product={p} onAddToCart={handleProductAdd} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const OrderDetailsModal = ({ order, onClose }: { order: OrderActivity; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#1E293B] w-full max-w-md rounded-[32px] p-6 shadow-2xl border border-gray-800 flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Order #{order.id}</h3>
            <p className="text-gray-400 text-xs">{order.date}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 bg-[#0B172A] rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-6 pr-2 custom-scrollbar">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${order.status === 'Delivered' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className={`text-sm font-bold ${order.status === 'Delivered' ? 'text-green-400' : 'text-yellow-400'}`}>{order.status}</span>
          </div>

          {/* Trip Details */}
          <div className="bg-[#0B172A] p-4 rounded-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-[#0077B6]/10 p-2 rounded-lg">
                <MapPin className="text-[#0077B6]" size={18} />
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Delivery Address</p>
                <p className="text-white text-sm leading-relaxed">{order.deliveryAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#0077B6]/10 p-2 rounded-lg">
                <Truck className="text-[#0077B6]" size={18} />
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Vehicle Type & No.</p>
                <p className="text-white text-sm">{order.vehicle} - <span className="font-mono text-[#0077B6] font-bold">{order.vehicleNumber}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#0077B6]/10 p-2 rounded-lg">
                <User className="text-[#0077B6]" size={18} />
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Driver Name</p>
                <p className="text-white text-sm">{order.driverName}</p>
              </div>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm px-1 flex items-center gap-2">
              <Clock size={16} className="text-[#0077B6]" />
              Tracking Timeline
            </h4>
            <div className="relative pl-4 space-y-6">
              {/* Timeline Line */}
              <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-gray-800" />
              
              {order.timeline.map((step, idx) => (
                <div key={idx} className="relative flex gap-4">
                  <div className={`z-10 w-5 h-5 rounded-full border-4 border-[#1E293B] ${step.completed ? 'bg-[#0077B6]' : 'bg-gray-700'}`} />
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm font-bold ${step.completed ? 'text-white' : 'text-gray-500'}`}>{step.status}</p>
                      <span className="text-[10px] font-mono text-gray-500">{step.time}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm px-1">Order Summary</h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#0B172A]/50 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#0077B6] text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-lg">
                      {item.quantity}x
                    </div>
                    <span className="text-white text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-gray-400 text-xs font-mono">{item.price} TZS</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Price */}
        <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between items-center">
          <span className="text-gray-400 font-medium">Total Amount</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#0077B6]">{order.totalPrice}</span>
            <span className="text-[#0077B6] text-sm ml-1 font-bold">TZS</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const MapLoader = ({ apiKey, children }: { apiKey: string; children: (isLoaded: boolean) => React.ReactNode }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES
  });
  return <>{children(isLoaded)}</>;
};

const MapProvider = ({ apiKey, children }: { apiKey: string; children: (isLoaded: boolean) => React.ReactNode }) => {
  const isValidKey = apiKey && apiKey !== "" && apiKey !== "your_api_key_here" && apiKey !== "AIzaSyANXgw02rPWOY9DWMKtgrclXSTE3k9DoNU";
  if (!isValidKey) {
    return <>{children(false)}</>;
  }
  return <MapLoader apiKey={apiKey}>{children}</MapLoader>;
};

const ProfileModal = ({ user, onClose, onOpenMapConfig }: { user: UserProfile; onClose: () => void; onOpenMapConfig: () => void }) => {
  const [view, setView] = useState<'menu' | 'details'>('menu');
  const [formData, setFormData] = useState({ ...user });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (user?.uid) {
        await apiService.post('users', { 
          ...formData, 
          uid: user.uid,
          email: user.email,
          role: user?.role
        });
      }
      setView('menu');
    } catch (err) {
      console.error("Profile update error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    localStorage.removeItem('customUser');
    window.location.reload();
  };

  const menuItems = [
    { icon: UserIcon, label: 'Account Details', action: () => setView('details') },
    { icon: Ticket, label: 'Promo Code & Gift Cards', action: () => {} },
    { icon: ShoppingBag, label: 'Order History', action: () => {} },
    { icon: Info, label: 'Help Center', action: () => {} },
    { icon: FileText, label: 'About', action: () => {} },
  ];

  if (view === 'details') {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden">
        <div className="safe-top bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <button onClick={() => setView('menu')} className="text-gray-900 p-2 bg-gray-50 rounded-full transition-colors active:scale-95">
            <ArrowLeft size={24} />
          </button>
          <h3 className="text-xl font-bold text-gray-900">Account Details</h3>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex flex-col items-center mb-8">
               <div className="w-24 h-24 bg-[#E2E8F0] rounded-full flex items-center justify-center text-gray-400 border border-gray-100">
                  <UserIcon size={48} strokeWidth={1} />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-5 text-gray-900 font-bold focus:ring-2 focus:ring-[#ff6b00] outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-5 text-gray-900 font-bold focus:ring-2 focus:ring-[#ff6b00] outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full bg-[#ff6b00] text-white py-5 rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#F1F5F9] flex flex-col overflow-hidden">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="flex flex-col h-full w-full"
      >
        <div className="bg-white px-6 py-10 flex items-center gap-6 border-b border-gray-50">
          <div className="w-20 h-20 bg-[#F1F5F9] rounded-full flex items-center justify-center text-gray-400 ring-4 ring-white shadow-sm">
            <UserIcon size={40} strokeWidth={1} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[28px] font-medium text-gray-900 leading-tight">Hello</h3>
            <p className="text-[28px] font-bold text-gray-900 leading-tight tracking-tight">{user?.name || 'User'}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mt-4 bg-white border-t border-b border-gray-100 flex flex-col">
            {menuItems.map((item, idx) => (
              <button 
                key={idx}
                onClick={item.action}
                className={`flex items-center justify-between p-6 active:bg-gray-50 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center gap-5">
                  <item.icon size={26} className="text-gray-900" strokeWidth={1.5} />
                  <span className="text-[19px] font-medium text-gray-900">{item.label}</span>
                </div>
                <ChevronRight size={24} className="text-gray-900" strokeWidth={2.5} />
              </button>
            ))}
          </div>

          <div className="mt-4 bg-white border-t border-b border-gray-100 flex flex-col mb-8">
            <button 
              onClick={handleLogout}
              className="flex items-center justify-between p-6 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-5">
                <Settings size={26} className="text-gray-900" strokeWidth={1.5} />
                <span className="text-[19px] font-medium text-gray-900">Log Out</span>
              </div>
              <ChevronRight size={24} className="text-gray-900" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#F1F5F9]">
          <button 
            onClick={onClose}
            className="w-full bg-white text-gray-900 py-4 rounded-2xl font-bold border border-gray-200 shadow-sm active:scale-95 transition-all text-lg"
          >
            Back to Shopping
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const HorizontalProductCard = ({ product, onAddToCart, ...props }: { product: Product, onAddToCart: (item: any) => void, [key: string]: any }) => {
  return (
    <div className="flex-shrink-0 w-[50vw] max-w-[220px] flex flex-col bg-white border-r border-b border-gray-100 p-6 relative group snap-start hover:bg-gray-50/30 transition-all duration-300" {...props}>
      {product.featured && (
        <div className="absolute top-4 left-6 z-10">
          <div className="bg-orange-600 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-lg shadow-orange-600/20">
            Featured
          </div>
        </div>
      )}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart({ productId: product.id, name: product.name, price: product.retailPrice, isWholesale: false });
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white border border-orange-100 flex items-center justify-center text-[#ff6b00] active:scale-95 transition-all outline-none z-10 shadow-sm hover:shadow-md hover:scale-110"
      >
        <Plus size={20} strokeWidth={3} />
      </button>
      
      <div className="w-full aspect-square flex items-center justify-center px-2 py-6 mb-4 group-hover:scale-105 transition-transform duration-500">
        {product.image && (
          <img src={product.image} alt={product.name} className="w-full h-full object-contain filter drop-shadow-sm" referrerPolicy="no-referrer" />
        )}
      </div>
      
      <div className="w-full text-left mt-auto space-y-1">
        <div className="font-black text-gray-900 text-lg tracking-tight">
          TZS. {product.retailPrice?.toLocaleString() || '0'}
        </div>
        <div className="text-gray-500 text-sm leading-tight font-medium uppercase tracking-tight line-clamp-2">
          {product.name}
        </div>
      </div>
    </div>
  );
};

const VerticalProductListItem: React.FC<{ product: Product, onAddToCart: (item: any) => void }> = ({ product, onAddToCart }) => {
  return (
    <div 
      className="flex items-center gap-4 bg-[#1a2333] p-6 border-b border-gray-800/30 active:bg-[#243045] transition-colors cursor-pointer"
      onClick={() => onAddToCart({ productId: product.id, name: product.name, price: product.retailPrice, isWholesale: false })}
    >
      <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xl border border-gray-800">
        <img src={product.image || 'https://picsum.photos/seed/beer/200/200'} alt={product.name} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
      </div>
      
      <div className="flex-grow min-w-0">
        <h4 className="text-white font-bold text-[20px] leading-tight truncate">{product.name}</h4>
        <p className="text-gray-500 text-[15px] font-medium truncate mt-1">{product.category}</p>
      </div>
      
      <div className="flex-shrink-0 text-center px-4">
        {product.batchNumber ? (
          <>
            <p className="text-gray-500 text-[14px] font-mono leading-none mb-1">{product.batchNumber.split('-')[0]}-</p>
            <p className="text-gray-400 font-mono text-[14px]">{product.batchNumber.split('-')[1] || ''}</p>
          </>
        ) : (
          <p className="text-gray-500 text-xs font-mono">NO BATCH</p>
        )}
      </div>
      
      <div className="flex-shrink-0 text-right min-w-[70px]">
        <p className="text-white text-[32px] font-medium leading-none">{product.stock}</p>
      </div>
    </div>
  );
};

const ProductsTab = ({ 
  products, 
  isWholesale, 
  setIsWholesale, 
  addToCart,
  userRole,
  isLoaded,
  searchQuery,
  setSearchQuery,
  cartCount = 0
}: { 
  products: Product[]; 
  isWholesale: boolean; 
  setIsWholesale: (v: boolean) => void; 
  addToCart: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  userRole?: string;
  isLoaded?: boolean;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  cartCount?: number;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const urlCategory = searchParams.get('category');

  const [category, setCategory] = useState(urlCategory || 'All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!urlCategory || urlCategory === 'All') {
      setCategory(CLIENT_CATEGORIES[0].id);
    } else {
      setCategory(urlCategory);
    }
  }, [urlCategory]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (category !== 'All') {
      filtered = products.filter(p => p.category === category || (p.category && p.category.startsWith(`${category} > `)));
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.name?.toLowerCase() || '').includes(query) || 
        (p.category?.toLowerCase() || '').includes(query)
      );
    }
    return filtered;
  }, [products, category, searchQuery]);

  const handleProductAdd = (item: Omit<CartItem, 'id'>) => {
    addToCart(item);
    setToastMessage(`Added ${item.name} to cart`);
    setTimeout(() => setToastMessage(null), 3000);
  };

    const secondaryCategories = (CATEGORIES as any)[category] || [];

    const originalCategoryLabel = CLIENT_CATEGORIES.find(c => c.id === category)?.name || category;

    return (
      <div className="bg-white min-h-screen pb-32 font-sans relative">
        <AnimatePresence>
          {toastMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#ff6b00] text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm whitespace-nowrap"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-5 flex items-center justify-between border-b border-gray-100/50">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => { navigate(-1); }} 
              className="text-gray-900 hover:bg-gray-100 p-2 rounded-xl transition-colors active:scale-90"
            >
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
            <h1 className="text-gray-900 text-[20px] font-black tracking-tight">
              {category === 'Beer' ? 'Beers' : category}
            </h1>
          </div>
          <button 
            onClick={() => navigate('/cart')} 
            className="relative text-gray-900 hover:bg-gray-100 p-2 rounded-xl transition-colors active:scale-90"
          >
            <ShoppingCart size={24} strokeWidth={2.5} />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#ff6b00] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-[#ff6b00]/30">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="bg-white px-6 py-6 space-y-6 border-b border-gray-100/80">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-gray-400 group-focus-within:text-[#ff6b00] transition-colors" size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Search in Category..." 
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-200 rounded-[1.25rem] py-4 pl-12 pr-4 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#ff6b00]/5 focus:border-[#ff6b00]/30 transition-all font-medium" 
            />
          </div>

          <div className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 px-6">
            {CLIENT_CATEGORIES.map((c) => {
              const isActive = category === c.id;
              return (
                <button 
                  key={c.id} 
                  onClick={() => { setCategory(c.id); navigate(`/products?category=${c.id}`); }}
                  className={`relative flex-shrink-0 w-[140px] h-[105px] rounded-[24px] overflow-hidden group transition-all duration-500 active:scale-95 ${isActive ? 'ring-2 ring-[#ff6b00] ring-offset-4 ring-offset-white shadow-2xl shadow-[#ff6b00]/10' : 'shadow-sm border border-gray-100 hover:shadow-md'}`}
                >
                  <img src={c.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${isActive ? 'from-black/90 via-black/40' : 'from-black/70 via-black/20'} to-transparent transition-opacity duration-300`} />
                  <div className="absolute bottom-3 left-2 right-2">
                    <div className={`py-1.5 px-3 rounded-xl backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-[#ff6b00] shadow-xl shadow-[#ff6b00]/20 border-none scale-105' : 'bg-white/10 hover:bg-white/20'}`}>
                      <span className="text-white text-[10px] font-black uppercase tracking-[0.15em] truncate drop-shadow-md">
                        {c.name}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div 
                      layoutId="active-shine"
                      className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {category === 'Beer' && (
          <div className="px-6 mt-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 to-[#ff6b00] p-8 text-white shadow-2xl shadow-orange-500/20"
            >
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Weekly Special</span>
                </div>
                <h3 className="text-3xl font-black leading-tight tracking-tight">KILI SPECIAL<br/>OFFER 🍻</h3>
                <p className="text-sm font-medium opacity-90 max-w-[220px] leading-relaxed">
                  Get up to <span className="text-white font-black underline decoration-2 underline-offset-4">15% OFF</span> on all local beer crates this weekend!
                </p>
                <div className="flex items-center gap-4 mt-6">
                  <button className="rounded-[1.25rem] bg-white px-6 py-3.5 text-sm font-black text-[#ff6b00] active:scale-95 transition-all shadow-xl shadow-black/10">
                    REDEEM NOW
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase opacity-60">Ends in</span>
                    <span className="text-sm font-black">2d : 14h : 05m</span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 h-48 w-48 rotate-12 opacity-10 blur-[2px]">
                <Beer size={180} strokeWidth={1} />
              </div>
              <div className="absolute right-6 top-8 h-24 w-24 opacity-30 animate-pulse">
                <div className="w-full h-full rounded-full border-4 border-white/20" />
              </div>
            </motion.div>
          </div>
        )}

        <div className="space-y-10 pt-8">
          {secondaryCategories.map((subCat: string) => {
            const subCatProducts = filteredProducts.filter(p => p.category === `${category} > ${subCat}`);
            if (subCatProducts.length === 0) return null;

            return (
              <div key={subCat} className="space-y-3">
                <div className="flex items-center justify-between px-6">
                  <h3 className="text-[20px] font-bold text-black">{subCat}</h3>
                  <button className="text-[15px] text-black font-medium hover:opacity-70 transition-opacity">
                    View All
                  </button>
                </div>
                <div className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {subCatProducts.map(p => (
                    <HorizontalProductCard 
                      key={p.id} 
                      product={p} 
                      onAddToCart={handleProductAdd}
                    />
                  ))}
                  <div className="flex-shrink-0 w-4 h-full" /> {/* Padding at the end */}
                </div>
              </div>
            );
          })}

          {secondaryCategories.length === 0 && filteredProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-6">
                <h3 className="text-[20px] font-bold text-black uppercase">{category}</h3>
                <button className="text-[15px] text-black font-medium">View All</button>
              </div>
              <div className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {filteredProducts.map(p => (
                  <HorizontalProductCard 
                    key={p.id} 
                    product={p} 
                    onAddToCart={handleProductAdd}
                  />
                ))}
                <div className="flex-shrink-0 w-4 h-full" />
              </div>
            </div>
          )}

          {/* Fallback for products in this primary category but not in any defined secondary category */}
          {(() => {
            const matchedProducts = new Set();
            secondaryCategories.forEach((subCat: string) => {
              filteredProducts.filter(p => p.category === `${category} > ${subCat}`).forEach(p => matchedProducts.add(p.id));
            });
            const unclassifiedProducts = filteredProducts.filter(p => !matchedProducts.has(p.id));
            if (unclassifiedProducts.length === 0) return null;
            return (
              <div key="unclassified" className="space-y-3">
                <div className="flex items-center justify-between px-6">
                  <h3 className="text-[20px] font-bold text-black uppercase">OTHERS</h3>
                  <span className="text-[12px] text-gray-500 font-bold uppercase">{unclassifiedProducts.length} items</span>
                </div>
                <div className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {unclassifiedProducts.map(p => (
                    <HorizontalProductCard 
                      key={p.id} 
                      product={p} 
                      onAddToCart={handleProductAdd}
                    />
                  ))}
                  <div className="flex-shrink-0 w-4 h-full" />
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
};

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const DAR_ES_SALAAM_CENTER = { lat: -6.7924, lng: 39.2083 };
const HUB_LOCATION = { lat: -6.7724, lng: 39.2283 }; // Mock B-Hub location

const MapComponent = ({ isLoaded, destination, progress, showRoute = true }: { isLoaded: boolean, destination?: { lat: number, lng: number }, progress?: number, showRoute?: boolean }) => {
  // @ts-ignore
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const userApiKey = localStorage.getItem('GOOGLE_MAPS_API_KEY');
  const activeKey = (apiKey && apiKey !== "your_api_key_here" && apiKey !== "AIzaSyANXgw02rPWOY9DWMKtgrclXSTE3k9DoNU") ? apiKey : userApiKey;
  
  const [directions, setDirections] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const destLat = destination?.lat;
  const destLng = destination?.lng;

  useEffect(() => {
    if (isLoaded && destLat && destLng && showRoute && typeof window.google !== 'undefined') {
      const service = new window.google.maps.DirectionsService();
      service.route(
        {
          origin: HUB_LOCATION,
          destination: { lat: destLat, lng: destLng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            setMapError(null);
          } else {
            console.error('Directions request failed due to ' + status);
            setMapError(`Directions request failed: ${status}`);
          }
        }
      );
    }
  }, [isLoaded, destLat, destLng, showRoute]);

  // If no key is provided or it's the placeholder
  if (!activeKey || activeKey === "your_api_key_here") {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-yellow-500/10 p-4 rounded-full text-yellow-500">
          <Info size={32} />
        </div>
        <div className="space-y-2">
          <p className="text-white font-bold">Google Maps API Key Required</p>
          <p className="text-gray-400 text-xs leading-relaxed">
            A valid Google Maps API key is required to enable maps and address search. Please configure it in your profile settings.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[#0077B6] text-xs font-bold">
          <User size={14} />
          <span>Profile &gt; Map Settings</span>
        </div>
      </div>
    );
  }

  if (!isLoaded) return <div className="w-full h-full bg-gray-800 animate-pulse flex items-center justify-center text-gray-500">Loading Map...</div>;

  // Calculate truck position based on progress along the route
  let truckPos = HUB_LOCATION;
  if (directions && progress !== undefined) {
    const route = directions.routes[0].overview_path;
    const index = Math.floor((progress / 100) * (route.length - 1));
    truckPos = { lat: route[index].lat(), lng: route[index].lng() };
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={truckPos || DAR_ES_SALAAM_CENTER}
      zoom={13}
      options={{
        disableDefaultUI: true,
        styles: [
          { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
          { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
          { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
          { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
          { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
          { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
          { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
          { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
          { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
          { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
          { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
          { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
          { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
          { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
          { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
          { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
          { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
          { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
        ]
      }}
    >
      {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#0077B6', strokeOpacity: 0.8, strokeWeight: 5 } }} />}
      
      {mapError && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-2 rounded-lg text-xs font-medium z-20 flex items-center gap-2">
          <Info size={14} />
          <span>{mapError}</span>
        </div>
      )}
      
      <Marker position={HUB_LOCATION} icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }} />
      {destination && <Marker position={destination} icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' }} />}
      {progress !== undefined && typeof window.google !== 'undefined' && (
        <Marker 
          position={truckPos} 
          icon={{ 
            url: 'https://cdn-icons-png.flaticon.com/512/2554/2554978.png', // Truck icon
            scaledSize: new window.google.maps.Size(40, 40)
          }} 
        />
      )}
    </GoogleMap>
  );
};

const CheckoutFlow = ({ isOpen, onClose, cart, isLoaded, onComplete, userName, selectedCustomer }: { 
  isOpen: boolean; 
  onClose: () => void; 
  cart: CartItem[]; 
  isLoaded: boolean;
  onComplete: (details: {
    customerName: string;
    subtotal: number;
    transportCost: number;
    discountAmount: number;
    discountType: 'percentage' | 'flat';
    totalCost: number;
    destinationAddress: string;
    vehicle: string;
    driverName: string;
    paymentMode: string;
  }) => void;
  userName: string;
  selectedCustomer?: Customer | null;
}) => {
  const [step, setStep] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState<{id: number, name: string, address: string, distance: string, lat: number, lng: number} | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<typeof TRUCKS[0] | null>(null);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [trackingProgress, setTrackingProgress] = useState(0);

  useEffect(() => {
    if (selectedCustomer) {
      setSelectedAddress({
        id: Date.now(),
        name: selectedCustomer.name,
        address: selectedCustomer.address,
        distance: 'Calculating...',
        lat: selectedCustomer.lat,
        lng: selectedCustomer.lng
      });
    }
  }, [selectedCustomer]);

  const parsePrice = (p: string) => {
    if (!p) return 0;
    const clean = p.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };
  const formatPrice = (p: number) => p.toLocaleString();

  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');

  const productTotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);
  const discountAmount = discountType === 'percentage' ? (productTotal * (discountValue / 100)) : discountValue;
  const transportFee = selectedTruck ? parsePrice(selectedTruck.price) : 0;
  const grandTotal = Math.max(0, productTotal - discountAmount + transportFee);

  useEffect(() => {
    if (step === 4) {
      const interval = setInterval(() => {
        setTrackingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [step]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && selectedAddress) setStep(2);
    else if (step === 2 && selectedTruck) setStep(3);
    else if (step === 3) {
      onComplete({
        customerName: userName,
        subtotal: productTotal,
        transportCost: transportFee,
        discountAmount: discountAmount,
        discountType: discountType,
        totalCost: grandTotal,
        destinationAddress: selectedAddress?.address || '',
        vehicle: selectedTruck?.name || '',
        driverName: 'Bakari Juma', // Mock driver
        paymentMode: selectedPayment.name
      });
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 4) onClose();
    else if (step > 1) setStep(step - 1);
    else onClose();
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white z-[100] flex flex-col"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <button onClick={handleBack} className="bg-gray-50 text-gray-900 p-3 rounded-2xl hover:bg-gray-100 transition-all active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
          {step === 1 ? 'Route' : step === 2 ? 'Vehicle' : step === 3 ? 'Confirm' : 'Tracking'}
        </h2>
        <div className="w-12" /> {/* Spacer */}
      </div>

      <div className="flex-grow overflow-y-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-50 rounded-[32px] p-6 space-y-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup</p>
                    <p className="text-sm font-bold text-gray-900">B-Hub Distribution Center</p>
                  </div>
                </div>
                
                <div className="relative pl-1.5 border-l-2 border-dashed border-gray-200 ml-[5px] py-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-gray-300 ml-[-7.5px]" />
                    <div className="flex-grow">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destination</p>
                      {isLoaded ? (
                        <Autocomplete
                          onLoad={(autocomplete) => {
                            autocomplete.addListener('place_changed', () => {
                              const place = autocomplete.getPlace();
                              if (place.geometry && place.geometry.location) {
                                const lat = place.geometry.location.lat();
                                const lng = place.geometry.location.lng();
                                setSelectedAddress({
                                  id: Date.now(),
                                  name: place.name || 'Selected Location',
                                  address: place.formatted_address || '',
                                  distance: 'Searching...',
                                  lat,
                                  lng
                                });
                                setStep(2);
                              }
                            });
                          }}
                        >
                          <input 
                            type="text" 
                            placeholder="Where are we delivering?" 
                            defaultValue={selectedAddress?.address || ''}
                            className="w-full bg-transparent text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none"
                          />
                        </Autocomplete>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Loading maps..." 
                          disabled
                          className="w-full bg-transparent text-sm font-bold text-gray-300 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Saved Locations</h3>
                <div className="space-y-2">
                  {ADDRESSES.map((addr) => (
                    <button 
                      key={addr.id}
                      onClick={() => { setSelectedAddress(addr); setStep(2); }}
                      className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 rounded-3xl transition-all border border-transparent hover:border-gray-100 group"
                    >
                      <div className="bg-gray-50 p-3 rounded-2xl text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">
                        <MapPin size={24} />
                      </div>
                      <div className="flex-grow text-left">
                        <p className="text-gray-900 font-bold">{addr.name}</p>
                        <p className="text-gray-400 text-xs truncate">{addr.address}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{addr.distance}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-lg">
                    <Info size={16} />
                  </div>
                  <span className="text-gray-900 text-xs font-bold leading-tight">20% Wholesale Promo Active<br/><span className="text-[10px] text-primary/60 font-black uppercase">Automatic Apply</span></span>
                </div>
              </div>

              <div className="space-y-3">
                {TRUCKS.map((truck) => (
                  <button 
                    key={truck.id}
                    onClick={() => setSelectedTruck(truck)}
                    className={`w-full flex items-center gap-4 p-5 rounded-[32px] border transition-all ${selectedTruck?.id === truck.id ? 'bg-gray-900 border-gray-900 shadow-xl' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="text-4xl filter drop-shadow-lg">{truck.icon}</div>
                    <div className="flex-grow text-left">
                      <div className="flex justify-between items-center mb-1">
                        <p className={`font-black ${selectedTruck?.id === truck.id ? 'text-white' : 'text-gray-900'}`}>{truck.name}</p>
                        <p className={`font-black ${selectedTruck?.id === truck.id ? 'text-primary' : 'text-primary'}`}>TSh {truck.price}</p>
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedTruck?.id === truck.id ? 'text-gray-500' : 'text-gray-400'}`}>
                        {truck.time} • {truck.capacity}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="h-48 bg-gray-50 rounded-[40px] relative overflow-hidden border border-gray-100 shadow-sm">
                <MapComponent 
                  isLoaded={isLoaded}
                  destination={selectedAddress && 'lat' in selectedAddress ? { lat: (selectedAddress as any).lat, lng: (selectedAddress as any).lng } : undefined} 
                />
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl flex items-center gap-3 shadow-lg z-10 border border-white">
                  <div className="bg-primary/20 p-2 rounded-full text-primary">
                    <Clock size={16} />
                  </div>
                  <p className="text-gray-900 text-xs font-black uppercase tracking-tight">ETA: 15-20 Min Delivery</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] space-y-6 border border-gray-100 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full" />
                
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</h4>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-bold uppercase">Drinks Total</span>
                      <span className="text-gray-900 font-bold">TSh {formatPrice(productTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-bold uppercase">Transport</span>
                      <span className="text-gray-900 font-bold">TSh {formatPrice(transportFee)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-red-500">
                        <span className="text-xs font-bold uppercase tracking-tighter">Promotional Discount</span>
                        <span className="font-black">-TSh {formatPrice(discountAmount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-gray-100" />

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Promo Code / Tips</p>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Value..."
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="flex-grow bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-gray-900 text-sm font-bold focus:ring-1 focus:ring-primary/20 focus:outline-none"
                      />
                      <div className="flex bg-gray-100 rounded-2xl p-1">
                        <button 
                          onClick={() => setDiscountType('percentage')}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${discountType === 'percentage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                        >
                          %
                        </button>
                        <button 
                          onClick={() => setDiscountType('flat')}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${discountType === 'flat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                        >
                          TSh
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Grand Total</span>
                    <span className="text-2xl font-black text-gray-900 tracking-tight">TSh {formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="h-80 bg-gray-100 rounded-[40px] relative overflow-hidden shadow-inner border border-gray-100">
                <MapComponent 
                  isLoaded={isLoaded}
                  destination={selectedAddress && 'lat' in selectedAddress ? { lat: (selectedAddress as any).lat, lng: (selectedAddress as any).lng } : undefined}
                  progress={trackingProgress}
                />
              </div>

              <div className="bg-white p-8 rounded-[40px] space-y-8 border border-gray-100 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-[50px] rounded-full" />
                
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[4px] mb-1">Status Report</p>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                      {trackingProgress < 30 ? 'Packing...' : trackingProgress < 100 ? 'Dispatched' : 'Delivered!'}
                    </h3>
                  </div>
                  <div className="bg-green-100 text-green-600 px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest animate-pulse border border-green-200">
                    LOCATING
                  </div>
                </div>

                <div className="relative pt-1">
                  <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-100">
                    <motion.div 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                      animate={{ width: `${trackingProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                  <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    <img src="https://i.pravatar.cc/150?u=driver" alt="Driver" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned Driver</p>
                    <p className="text-lg font-black text-gray-900">{userName}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-primary text-xs font-black">4.9 RATING</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-white p-4 rounded-2xl text-gray-900 shadow-sm border border-gray-100 hover:scale-110 transition-all">
                      <MessageSquare size={20} />
                    </button>
                    <button className="bg-primary p-4 rounded-2xl text-white shadow-lg shadow-primary/20 hover:scale-110 transition-all">
                      <Phone size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-50 z-20">
        {step === 2 && (
          <button 
            disabled={!selectedTruck}
            onClick={handleNext}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[4px] shadow-2xl shadow-primary/40 hover:bg-primary-dark disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            Choose {selectedTruck?.name || 'Vehicle'}
          </button>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex justify-between items-center px-4 w-full bg-gray-50 py-4 rounded-2xl border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{selectedPayment.icon}</span> 
                <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{selectedPayment.name}</span>
              </div>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Change</p>
            </button>
            <button 
              onClick={handleNext}
              className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[4px] shadow-2xl shadow-primary/40 hover:bg-primary-dark transition-all active:scale-[0.98]"
            >
              Order Now • TSh {formatPrice(grandTotal)}
            </button>
          </div>
        )}
        {step === 4 && (
          <button 
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[4px] shadow-2xl shadow-gray-900/40 hover:bg-black transition-all active:scale-[0.98]"
          >
            Order Received
          </button>
        )}
        {step === 1 && (
          <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-[5px]">Select Destination</p>
        )}
      </div>

      {/* Payment Selection Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Payments</h3>
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <button 
                    key={method.id}
                    onClick={() => {
                      setSelectedPayment(method);
                      setIsPaymentModalOpen(false);
                    }}
                    className={`w-full flex items-center gap-5 p-5 rounded-3xl border transition-all ${selectedPayment.id === method.id ? 'bg-gray-50 border-primary/20 shadow-sm' : 'bg-white border-gray-100'}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${method.color || 'bg-gray-100'}`}>
                      {method.icon}
                    </div>
                    <div className="flex-grow text-left">
                      <p className="text-gray-900 font-bold">{method.name}</p>
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        {method.id === 'cash' ? 'COD - Delivery' : method.id === 'card' ? 'Online Gateway' : 'Mobile Service'}
                      </p>
                    </div>
                    {selectedPayment.id === method.id && (
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                        <Check size={16} className="text-white" strokeWidth={4} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-full mt-8 bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[4px] shadow-2xl hover:bg-black transition-all"
              >
                Confirm Payment
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CartTab = ({ cart, removeFromCart, updateCartQuantity, onCheckout, isLoaded, userName, selectedCustomer }: { 
  cart: CartItem[]; 
  removeFromCart: (id: number) => void; 
  updateCartQuantity: (id: number, delta: number) => void;
  onCheckout: (details: any) => void;
  isLoaded: boolean;
  userName: string;
  selectedCustomer?: Customer | null;
}) => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0);
  const totalItems = cart.reduce((s, i) => s + (i.quantity || 1), 0);

  // Beverage color palette by name keywords
  const getBevColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('lager') || n.includes('beer')) return { bg: 'from-amber-400 to-orange-500', icon: '🍺' };
    if (n.includes('wine') || n.includes('red')) return { bg: 'from-rose-500 to-red-700', icon: '🍷' };
    if (n.includes('whisky') || n.includes('whiskey')) return { bg: 'from-amber-600 to-yellow-800', icon: '🥃' };
    if (n.includes('gin')) return { bg: 'from-sky-400 to-blue-600', icon: '🍸' };
    if (n.includes('juice') || n.includes('mango') || n.includes('orange')) return { bg: 'from-orange-300 to-amber-400', icon: '🥤' };
    if (n.includes('water')) return { bg: 'from-blue-300 to-cyan-500', icon: '💧' };
    if (n.includes('soda') || n.includes('cola')) return { bg: 'from-gray-700 to-gray-900', icon: '🥤' };
    if (n.includes('vodka')) return { bg: 'from-slate-300 to-slate-500', icon: '🍸' };
    return { bg: 'from-primary/80 to-orange-600', icon: '🍶' };
  };

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F7' }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: '#F5F5F7' }}>
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[3px]">Your Selection</p>
              <h2 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.5px' }}>My Cart</h2>
            </div>
            {cart.length > 0 && (
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                <span className="text-lg font-black text-gray-900">{subtotal.toLocaleString()} <span className="text-primary text-sm">TZS</span></span>
              </div>
            )}
          </div>
          {selectedCustomer && (
            <div className="mt-3 flex items-center gap-2.5 bg-orange-50 border border-orange-100 px-4 py-2.5 rounded-2xl">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-white" />
              </div>
              <div>
                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Ordering For</p>
                <p className="text-xs font-black text-gray-900 leading-tight">{selectedCustomer.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="px-4 pb-48">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 space-y-5">
            <div className="w-28 h-28 rounded-[32px] bg-white shadow-lg flex items-center justify-center" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.07)' }}>
              <ShoppingCart className="text-gray-200" size={48} />
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-900 mb-1">Cart is empty</p>
              <p className="text-sm text-gray-400 font-medium">Add some drinks to get started</p>
            </div>
            <Link to="/products"
              className="mt-2 bg-primary text-white px-10 py-3.5 rounded-2xl font-black uppercase text-xs tracking-[3px] shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
            >
              Browse Drinks
            </Link>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {cart.map((item, idx) => {
              const bev = getBevColor(item.name);
              const unitPrice = Number(item.price) || 0;
              const lineTotal = unitPrice * (item.quantity || 1);
              return (
                <div key={item.id}
                  className="bg-white rounded-[28px] overflow-hidden"
                  style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', transform: 'translateZ(0)' }}
                >
                  <div className="flex items-center gap-0">
                    {/* Colored left accent / image panel */}
                    <div className={`w-[88px] h-[88px] flex-shrink-0 bg-gradient-to-br ${bev.bg} flex items-center justify-center rounded-[28px] m-3 mr-0`}>
                      <span className="text-[34px] leading-none drop-shadow-lg">{bev.icon}</span>
                    </div>

                    {/* Info section */}
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest truncate">
                        {item.isWholesale ? 'Wholesale' : 'Retail'}
                      </p>
                      <p className="text-[15px] font-black text-gray-900 leading-tight truncate" style={{ letterSpacing: '-0.3px' }}>
                        {item.name}
                      </p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-primary font-black text-base">{lineTotal.toLocaleString()}</span>
                        <span className="text-gray-400 text-[11px] font-bold">TZS</span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-gray-300 font-bold">({unitPrice.toLocaleString()} × {item.quantity})</span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="mr-3 w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Qty stepper row */}
                  <div className="flex items-center border-t border-gray-50 px-4 py-2.5">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex-1">Quantity</p>
                    <div className="flex items-center gap-0 bg-gray-50 rounded-2xl border border-gray-100" style={{ overflow: 'hidden' }}>
                      <button
                        onClick={() => updateCartQuantity(item.id, -1)}
                        disabled={(item.quantity || 1) <= 1}
                        className="w-11 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 active:bg-gray-100 transition-all font-black text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <div className="w-10 h-9 flex items-center justify-center font-black text-sm text-gray-900 bg-white border-l border-r border-gray-100">
                        {item.quantity || 1}
                      </div>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="w-11 h-9 flex items-center justify-center text-gray-400 hover:text-primary active:bg-orange-50 transition-all font-black text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Checkout Panel */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="mx-3 mb-20">
            <div
              className="rounded-[32px] p-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
                boxShadow: '0 -4px 40px rgba(0,0,0,0.18), 0 20px 60px rgba(0,0,0,0.25)'
              }}
            >
              {/* Glow orbs */}
              <div className="absolute top-0 right-6 w-28 h-28 bg-primary/20 blur-[50px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-500/10 blur-[40px] rounded-full pointer-events-none" />

              {/* Summary rows */}
              <div className="relative z-10 space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px]">{totalItems} {totalItems === 1 ? 'Item' : 'Items'}</span>
                  <span className="text-[11px] font-bold text-gray-400">{subtotal.toLocaleString()} TZS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px]">Delivery</span>
                  <span className="text-[11px] font-bold text-green-400 uppercase">Calculated at checkout</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-gray-300 uppercase tracking-[2px]">Total Payable</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white" style={{ letterSpacing: '-1px' }}>
                      {subtotal.toLocaleString()}
                    </span>
                    <span className="text-primary font-black text-sm">TZS</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-4 rounded-2xl font-black uppercase text-sm tracking-[3px] transition-all active:scale-[0.98] relative z-10 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)',
                  boxShadow: '0 8px 24px rgba(255,107,26,0.45)'
                }}
              ><ShoppingCart size={16} className="text-white opacity-80" />
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isCheckoutOpen && (
          <CheckoutFlow 
            isOpen={isCheckoutOpen} 
            onClose={() => setIsCheckoutOpen(false)} 
            cart={cart}
            isLoaded={isLoaded}
            onComplete={onCheckout}
            userName={userName}
            selectedCustomer={selectedCustomer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ChatTab = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string; image?: string }[]>([
    { role: 'bot', text: 'TUKO TAYARI! I am your B-Hub Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = input.trim();
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setMessages(prev => [...prev, { role: 'user', text: userMessage, image: currentImage || undefined }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
      const ai = new GoogleGenAI({ apiKey });
      
      const systemPrompt = `You are a helpful assistant for "B-Hub", a drink delivery app in Tanzania. 
      If an image is provided, identify the beverage and tell the user if it's likely available in our store (we sell sodas, beers, water, and juices). 
      Suggest where they might find it in Dar es Salaam if we don't have it. Answer in English blended with Tanzanian vibe.`;

      let response;
      if (currentImage) {
        const base64Data = currentImage.split(',')[1];
        const mimeType = currentImage.split(';')[0].split(':')[1];
        
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { text: `${systemPrompt}\n\nUser query: ${userMessage || "What is this beverage?"}` },
              { inlineData: { data: base64Data, mimeType } }
            ]
          },
          config: {
            tools: [{ googleSearch: {} }] as any
          }
        });
      } else {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `${systemPrompt}\n\nUser query: ${userMessage}`,
          config: {
            tools: [{ googleSearch: {} }] as any
          }
        });
      }

      const botResponse = response.text || "Naomba radhi, nimeshindwa kukuelewa sasa hivi.";
      
      let sourcesText = "";
      const chunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        sourcesText = "\n\nChanzo:\n" + chunks.map((chunk: any, index: number) => {
          if (chunk.web) return `[${index + 1}] ${chunk.web.title} (${chunk.web.uri})`;
          return "";
        }).filter(Boolean).join("\n");
      }

      setMessages(prev => [...prev, { role: 'bot', text: botResponse + sourcesText }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "Hapana, system kidogo ina tatizo. Jaribu tena baadaye!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] bg-white p-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
          <Bot className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">AI Assistant</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Always Listening
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-hide">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-gray-900 text-white rounded-tr-none border-gray-800' 
                : 'bg-gray-50 text-gray-800 rounded-tl-none border-gray-100'
            }`}>
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="User upload" 
                  className="w-full h-48 object-cover rounded-2xl mb-2"
                  referrerPolicy="no-referrer"
                />
              )}
              <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 p-4 rounded-3xl rounded-tl-none border border-gray-100 flex gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {selectedImage && (
          <div className="relative w-24 h-24">
            <img src={selectedImage} className="w-full h-full object-cover rounded-[24px] border-4 border-primary ring-4 ring-gray-100 shadow-xl" alt="Selected" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg border-2 border-white"
            >
              <X size={14} />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl hover:text-primary transition-all active:scale-90 flex items-center justify-center border border-gray-100 shadow-sm"
          >
            <Camera size={24} />
          </button>
          <div className="relative flex-grow">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Uliza chochote..."
              className="w-full bg-gray-50 text-gray-900 py-4 px-6 rounded-2xl border border-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-bold placeholder:text-gray-300"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="absolute right-2 top-2 bg-primary p-2.5 rounded-xl text-white hover:bg-primary-dark disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-primary/20"
            >
              <Send size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavLink = ({ to, icon: Icon, badge }: { to: string; icon: any; badge?: number }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center relative transition-colors ${active ? 'text-[#ff6b00]' : 'text-gray-400'}`}>
      <div className="relative p-2 group-active:scale-90 transition-transform">
        <Icon size={32} strokeWidth={active ? 2 : 1.5} />
        {badge !== undefined && badge > 0 && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white"
          >
            {badge}
          </motion.span>
        )}
      </div>
    </Link>
  );
};

type GroupedOrder = {
  customerName: string;
  orders: Order[];
  totalCost: number;
  latestTimestamp: string;
  latestOrderId: string;
  status: string;
  paymentStatus: string;
  paymentMode?: string;
  destinationAddress: string;
  driverName?: string;
};

const ManagerOrdersTab = ({ orders, onReceivePayment, onDeleteOrderGroup, onDeleteOrderItem, searchQuery }: { orders: Order[], onReceivePayment: (customerName: string, paymentMode: string) => void, onDeleteOrderGroup: (group: GroupedOrder) => void, onDeleteOrderItem: (group: GroupedOrder, productId: string, isWholesale: boolean) => void, searchQuery?: string }) => {
  const [selectedGroup, setSelectedGroup] = useState<GroupedOrder | null>(null);
  const [filter, setFilter] = useState<'All' | 'Unpaid' | 'Paid' | 'On Progress' | 'Delivered'>('All');
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupedOrder | null>(null);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, GroupedOrder> = {};
    orders.forEach(order => {
      const groupKey = `${order.customerName}-${order.paymentStatus}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          customerName: order.customerName,
          orders: [],
          totalCost: 0,
          latestTimestamp: order.timestamp,
          latestOrderId: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMode: order.paymentMode || 'Cash',
          destinationAddress: order.destinationAddress,
          driverName: order.driverName
        };
      }
      groups[groupKey].orders.push(order);
      groups[groupKey].totalCost += order.totalCost;

      if (new Date(order.timestamp) >= new Date(groups[groupKey].latestTimestamp)) {
        groups[groupKey].latestTimestamp = order.timestamp;
        groups[groupKey].latestOrderId = order.id;
        groups[groupKey].status = order.status;
        groups[groupKey].destinationAddress = order.destinationAddress;
        groups[groupKey].driverName = order.driverName;
        if (order.paymentMode) {
          groups[groupKey].paymentMode = order.paymentMode;
        }
      }
    });
    return Object.values(groups).sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());
  }, [orders]);

  const todayOrdersCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter(order => new Date(order.timestamp) >= today).length;
  }, [orders]);

  useEffect(() => {
    if (selectedGroup) {
      const updatedGroup = groupedOrders.find(g => g.customerName === selectedGroup.customerName && g.paymentStatus === selectedGroup.paymentStatus);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
      } else {
        setSelectedGroup(null);
      }
    }
  }, [groupedOrders]);

  const filteredOrders = useMemo(() => {
    return groupedOrders.filter(group => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesOrderNumber = group.orders.some(o => (o.id?.toLowerCase() || '').includes(query));
        if (!matchesOrderNumber) return false;
      }

      const isTable = !group.destinationAddress || group.destinationAddress === 'In-Store';
      
      if (filter === 'All') return true;
      if (filter === 'Unpaid') return group.paymentStatus === 'Unpaid';
      if (filter === 'Paid') return group.paymentStatus === 'Paid';
      
      if (isTable) {
        // Table orders only show in Paid/Unpaid/All
        if (filter === 'Delivered' || filter === 'On Progress') return false;
      } else {
        // Delivery orders
        if (filter === 'Delivered') return group.status === 'Delivered';
        if (filter === 'On Progress') return ['Pending', 'Processing', 'On the way'].includes(group.status || '');
      }
      return true;
    });
  }, [groupedOrders, filter, searchQuery]);

  return (
    <div className="space-y-6 text-white pb-24">
      <UserGuideBanner 
        role="manager"
        title="Order Management" 
        description="Track and manage all customer orders. You can view order details, update payment statuses when customers pay, and monitor delivery progress." 
      />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Store Orders</h2>
        <div className="bg-[#0077B6]/10 px-3 py-1 rounded-full border border-[#0077B6]/30">
          <span className="text-[#0077B6] text-xs font-bold">{todayOrdersCount} Orders Today</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Unpaid', 'Paid', 'On Progress', 'Delivered'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              filter === f 
                ? 'bg-[#0077B6] text-white' 
                : 'bg-[#1E293B] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#1E293B] p-12 rounded-[32px] text-center space-y-4 border border-gray-800">
            <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-600">
              <Package size={32} />
            </div>
            <p className="text-gray-400 font-medium">No orders received yet</p>
          </div>
        ) : (
          filteredOrders.map(group => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`${group.customerName}-${group.paymentStatus}`} 
              onClick={() => setSelectedGroup(group)}
              className="bg-[#1E293B] p-5 rounded-[24px] border border-gray-800 hover:border-[#0077B6] transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-lg text-white group-hover:text-[#0077B6] transition-colors">{group.latestOrderId}</p>
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full uppercase tracking-tighter font-mono">
                      {group.orders.length} Order{group.orders.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{new Date(group.latestTimestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {group.paymentStatus === 'Unpaid' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setGroupToDelete(group);
                      }}
                      className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    group.paymentStatus === 'Paid' ? 'bg-green-500/10 text-green-500' : 
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {group.paymentStatus}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Customer/Table</p>
                  <p className="font-bold text-white">{group.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Total</p>
                  <p className="font-black text-[#0077B6] text-lg">TSh {group.totalCost.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedGroup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-[#1E293B] w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1E293B]/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold text-white">Orders Details</h3>
                  <p className="text-xs text-gray-500">{selectedGroup.customerName}</p>
                </div>
                <button onClick={() => setSelectedGroup(null)} className="bg-gray-800 p-2 rounded-full text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Payment Status</p>
                    <p className={`font-bold ${selectedGroup.paymentStatus === 'Paid' ? 'text-green-400' : 'text-red-400'}`}>{selectedGroup.paymentStatus}</p>
                  </div>
                  <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Total Orders</p>
                    <p className="font-bold text-green-400">{selectedGroup.orders.length}</p>
                  </div>
                  <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Payment Mode</p>
                    <p className="font-bold text-white">{selectedGroup.paymentMode}</p>
                  </div>
                  {(!selectedGroup.destinationAddress || selectedGroup.destinationAddress === 'In-Store') ? (
                    <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                      <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Order Type</p>
                      <p className="font-bold text-blue-400">Table Order</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800">
                        <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Delivery Status</p>
                        <p className="font-bold text-blue-400">{selectedGroup.status}</p>
                      </div>
                      <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800 col-span-2">
                        <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Location</p>
                        <p className="font-bold text-white truncate">{selectedGroup.destinationAddress}</p>
                      </div>
                      <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800 col-span-2">
                        <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Driver Name</p>
                        <p className="font-bold text-white">{selectedGroup.driverName || 'Not Assigned'}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">All Items Summary</h4>
                  <div className="space-y-2">
                    {Object.values(selectedGroup.orders.flatMap(o => o.items).reduce((acc: any, item) => {
                      const key = `${item.productId}-${item.isWholesale}`;
                      if (!acc[key]) acc[key] = { ...item, quantity: 0, total: 0 };
                      acc[key].quantity += 1;
                      acc[key].total += item.price;
                      return acc;
                    }, {})).map((item: any, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#0B172A] p-4 rounded-2xl border border-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-[#0077B6] font-bold">
                            {item.quantity}x
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{item.name}</p>
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">
                              {item.isWholesale ? 'Wholesale Pcs' : 'Retail Pcs'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-black text-white">TSh {item.total.toLocaleString()}</p>
                          {selectedGroup.paymentStatus === 'Unpaid' && (
                            <button 
                              onClick={() => onDeleteOrderItem(selectedGroup, item.productId, item.isWholesale)}
                              className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0B172A] p-6 rounded-[24px] space-y-4 border border-gray-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Subtotal</span>
                    <span className="text-white font-bold">TSh {selectedGroup.orders.reduce((sum, o) => sum + o.subtotal, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Transport</span>
                    <span className="text-white font-bold">TSh {selectedGroup.orders.reduce((sum, o) => sum + o.transportCost, 0).toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-gray-800" />
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black uppercase tracking-widest text-xs">Total Cost</span>
                    <span className="text-[#0077B6] font-black text-2xl">TSh {selectedGroup.totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-[#0B172A] border-t border-gray-800 space-y-3">
                {selectedGroup.paymentStatus === 'Unpaid' && (
                  showPaymentDropdown ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400 font-bold mb-2">Select Payment Mode:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['Cash', 'Mobile Payment', 'Card'].map(mode => (
                          <button
                            key={mode}
                            onClick={() => {
                              onReceivePayment(selectedGroup.customerName, mode);
                              setSelectedGroup(prev => prev ? { ...prev, paymentStatus: 'Paid', paymentMode: mode } : null);
                              setShowPaymentDropdown(false);
                            }}
                            className="bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-500 transition-all text-sm"
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => setShowPaymentDropdown(false)}
                        className="w-full bg-gray-700 text-white py-2 rounded-xl font-bold mt-2 hover:bg-gray-600 transition-all text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowPaymentDropdown(true)}
                      className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-500 transition-all"
                    >
                      Receive Payment
                    </button>
                  )
                )}
                <button 
                  onClick={() => {
                    setSelectedGroup(null);
                    setShowPaymentDropdown(false);
                  }}
                  className="w-full bg-[#1E293B] text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {groupToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1E293B] p-6 rounded-[32px] border border-gray-800 shadow-2xl max-w-sm w-full"
            >
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">Delete Orders?</h3>
              <p className="text-gray-400 text-center text-sm mb-6">
                Are you sure you want to delete all unpaid orders for <strong className="text-white">{groupToDelete.customerName}</strong>? This will permanently remove the orders and roll back the stock.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setGroupToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onDeleteOrderGroup(groupToDelete);
                    setGroupToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ManagerDashboard = ({ user, setUser, products, setProducts, sales, expenses, setExpenses, orders, vendors, setVendors, purchaseOrders, setPurchaseOrders, showSettingsModal, setShowSettingsModal }: { user: UserProfile, setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>, products: Product[], setProducts: React.Dispatch<React.SetStateAction<Product[]>>, sales: Sale[], expenses: Expense[], setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>, orders: Order[], vendors: Vendor[], setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>, purchaseOrders: PurchaseOrder[], setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>, showSettingsModal: boolean, setShowSettingsModal: (show: boolean) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const [restockType, setRestockType] = useState<'cartons' | 'pcs'>('cartons');
  const [restockBatch, setRestockBatch] = useState({
    batchNumber: '',
    expiryDate: '',
    buyingPricePerCarton: 0
  });
  const [showScanner, setShowScanner] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [showExpensesDashboardModal, setShowExpensesDashboardModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<{id: string, productId: string, amount: number, date: string}[]>([]);
  const [showReceiveInventoryModal, setShowReceiveInventoryModal] = useState(false);
  const [poDraftItems, setPoDraftItems] = useState<{[key: string]: {qty: number, cost: number}}>({});
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [receivedItems, setReceivedItems] = useState<{[key: string]: {qty: number, cost: number}}>({});
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorFormData, setVendorFormData] = useState<Partial<Vendor>>({
    name: '',
    address: '',
    cityState: '',
    postalCode: '',
    phone: '',
    email: ''
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'B-Hub',
    address: 'Mbezi Beach, Bagamoyo Road',
    cityState: 'Dar es Salaam, Tanzania',
    postalCode: 'P.O. Box 12345',
    email: 'info@beveragehub.co.tz',
    isVatApplicable: true,
    vatRate: 18
  });
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState<Partial<Expense>>({
    description: '',
    amount: 0,
    category: 'Rent',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash'
  });

  const [formData, setFormData] = useState<Partial<Product> & { numCartons?: number }>({
    category: 'Beer > Local Beers',
    wholesaleUnitSize: 12,
    numCartons: 0,
    stock: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    costPrice: 0,
    buyingPricePerCarton: 0,
    margin: 0,
    wholesaleMargin: 0,
    image: '',
    discount: '',
    barcode: '',
    expiryDate: '',
    batchNumber: '',
    reorderLevel: 10
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeFileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [inventoryFilter, setInventoryFilter] = useState('All');
  const [inventorySort, setInventorySort] = useState('default');
  const [expensePage, setExpensePage] = useState(0);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFinancialDetail, setShowFinancialDetail] = useState<string | null>(null);

  useEffect(() => {
    setExpensePage(0);
  }, [expenseCategoryFilter, expenseSearch, startDate, endDate]);

  const stockValue = useMemo(() => products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0), [products]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  
  const actualRevenue = useMemo(() => orders.reduce((sum, o) => {
    if (o.paymentStatus === 'Unpaid' && !user?.includeReceivableInRevenue) return sum;
    return sum + o.totalCost;
  }, 0), [orders, user?.includeReceivableInRevenue]);
  const actualCOGS = useMemo(() => sales.reduce((sum, s) => sum + (s.costPrice * s.quantity), 0), [sales]);
  const totalAdjustments = useMemo(() => inventoryAdjustments.reduce((sum, adj) => sum + (Number(adj.amount) || 0), 0), [inventoryAdjustments]);
  
  const expiredCost = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return products.reduce((sum, p) => {
      return sum + (p.batches || []).reduce((batchSum, b) => {
        if (b.expiryDate && b.expiryDate < today && b.stock > 0) {
          return batchSum + (b.stock * b.costPrice);
        }
        return batchSum;
      }, 0);
    }, 0);
  }, [products]);

  const actualVat = useMemo(() => user?.isVatApplicable ? actualRevenue * ((user?.vatRate || 18) / 100) : 0, [actualRevenue, user?.isVatApplicable, user?.vatRate]);
  const actualNetProfit = useMemo(() => actualRevenue - actualVat - actualCOGS - totalExpenses - expiredCost, [actualRevenue, actualVat, actualCOGS, totalExpenses, expiredCost]);

  const accountBalances = useMemo(() => {
    const balances = {
      'Cash': 0,
      'Mobile Payment': 0,
      'Card': 0
    };

    // Add paid orders
    orders.forEach(o => {
      if (o.paymentStatus === 'Paid' && o.paymentMode && balances[o.paymentMode as keyof typeof balances] !== undefined) {
        balances[o.paymentMode as keyof typeof balances] += o.totalCost;
      }
    });

    // Subtract expenses
    expenses.forEach(e => {
      if (e.paymentMode && balances[e.paymentMode as keyof typeof balances] !== undefined) {
        balances[e.paymentMode as keyof typeof balances] -= e.amount;
      }
    });

    return balances;
  }, [orders, expenses]);

  const totalCashBank = useMemo(() => Object.values(accountBalances).reduce((a: number, b: number) => a + b, 0), [accountBalances]);

  const filteredExpenses = useMemo(() => {
    let result = [...expenses].reverse();
    
    if (expenseCategoryFilter !== 'All') {
      result = result.filter(e => e.category === expenseCategoryFilter);
    }
    
    if (expenseSearch) {
      const search = expenseSearch.toLowerCase();
      result = result.filter(e => 
        (e.description?.toLowerCase() || '').includes(search) || 
        (e.category?.toLowerCase() || '').includes(search)
      );
    }

    if (startDate) {
      result = result.filter(e => e.date >= startDate);
    }

    if (endDate) {
      result = result.filter(e => e.date <= endDate);
    }
    
    return result;
  }, [expenses, expenseCategoryFilter, expenseSearch, startDate, endDate]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 119, 182); // #0077B6
    doc.text('B-Hub', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text('Operational Expenses Report', 105, 30, { align: 'center' });
    
    if (startDate || endDate) {
      doc.setFontSize(10);
      doc.text(`Period: ${startDate || 'Beginning'} to ${endDate || 'Present'}`, 105, 38, { align: 'center' });
    }
    
    // Table
    const tableData = filteredExpenses.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.description,
      e.category,
      `TSh ${e.amount.toLocaleString()}`
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [['Date', 'Description', 'Category', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 119, 182], textColor: [255, 255, 255], fontStyle: 'bold' },
      foot: [['', '', 'Total', `TSh ${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });
    
    doc.save(`Expenses_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const productSales = useMemo(() => {
    const salesMap: Record<string, number> = {};
    sales.forEach(s => {
      salesMap[s.productId] = (salesMap[s.productId] || 0) + s.quantity;
    });
    return salesMap;
  }, [sales]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Category Filter
    if (inventoryFilter !== 'All') {
      result = result.filter(p => p.category === inventoryFilter);
    }

    // Sorting
    switch (inventorySort) {
      case 'expiry':
        result.sort((a, b) => {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        });
        break;
      case 'sales':
        result.sort((a, b) => (productSales[b.id] || 0) - (productSales[a.id] || 0));
        break;
      case 'profit':
        result.sort((a, b) => (b.retailPrice - b.costPrice) - (a.retailPrice - a.costPrice));
        break;
      case 'stock':
        result.sort((a, b) => a.stock - b.stock);
        break;
      default:
        // Keep original order or sort by name
        break;
    }

    return result;
  }, [products, inventoryFilter, inventorySort, productSales]);

  const reorderProducts = useMemo(() => {
    return products.filter(p => p.stock <= (p.reorderLevel || 10));
  }, [products]);

  const exportPurchaseOrderPDF = () => {
    const doc = new jsPDF();
    const vendor = vendors.find(v => v.id === selectedVendorId);
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(companyInfo.name, 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Address: ${companyInfo.address}`, 20, 28);
    doc.text(`${companyInfo.cityState}`, 20, 33);
    doc.text(`Postal Code: ${companyInfo.postalCode}`, 20, 38);
    doc.text(`Email Address: ${companyInfo.email}`, 20, 43);
    
    // Title
    doc.setFontSize(32);
    doc.setTextColor(234, 88, 12); // Orange-600
    doc.text('Purchase Order', 190, 25, { align: 'right' });
    
    // Bill To & PO Info Section
    doc.setFillColor(255, 237, 213); // Orange-100
    doc.rect(20, 55, 170, 45, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill to', 25, 65);
    doc.text('Purchase Order#:', 120, 65);
    doc.text('Date:', 120, 72);
    doc.text('Delivery Date:', 120, 79);
    
    doc.setFont('helvetica', 'normal');
    if (vendor) {
      doc.text(vendor.name, 25, 72);
      doc.text(vendor.address, 25, 77);
      doc.text(vendor.cityState, 25, 82);
      doc.text(vendor.postalCode, 25, 87);
    } else {
      doc.text('Select Vendor', 25, 72);
    }
    
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    doc.text(poNumber, 160, 65);
    doc.text(new Date().toLocaleDateString(), 160, 72);
    doc.text('TBD', 160, 79);
    
    // Save PO to state
    const newPO: PurchaseOrder = {
      id: poNumber,
      vendorId: selectedVendorId,
      vendorName: vendor?.name || 'Unknown',
      date: new Date().toISOString(),
      status: 'Pending',
      totalAmount: 0, // Will update after calculating
      items: reorderProducts.map(p => {
        const draft = poDraftItems[p.id] || { qty: Math.ceil(((p.reorderLevel * 2) - p.stock) / p.wholesaleUnitSize), cost: p.buyingPricePerCarton };
        return {
          productId: p.id,
          productName: p.name,
          quantity: draft.qty,
          unitSize: p.wholesaleUnitSize,
          costPricePerCarton: draft.cost
        };
      })
    };
    
    // Table
    const tableData = reorderProducts.map(p => {
      const draft = poDraftItems[p.id] || { qty: Math.ceil(((p.reorderLevel * 2) - p.stock) / p.wholesaleUnitSize), cost: p.buyingPricePerCarton };
      const amount = draft.qty * draft.cost;
      return [
        p.name,
        draft.qty.toString(),
        draft.cost.toLocaleString(),
        amount.toLocaleString()
      ];
    });
    
    const subtotal = reorderProducts.reduce((sum, p) => {
      const draft = poDraftItems[p.id] || { qty: Math.ceil(((p.reorderLevel * 2) - p.stock) / p.wholesaleUnitSize), cost: p.buyingPricePerCarton };
      return sum + (draft.qty * draft.cost);
    }, 0);
    
    const taxRate = companyInfo.isVatApplicable ? companyInfo.vatRate : 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    newPO.totalAmount = total;
    setPurchaseOrders(prev => [newPO, ...prev]);
    
    autoTable(doc, {
      startY: 110,
      head: [['Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      theme: 'plain',
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Totals
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal', 140, finalY);
    doc.text(subtotal.toLocaleString(), 190, finalY, { align: 'right' });
    
    doc.text('Tax Rate', 140, finalY + 7);
    doc.text(`${taxRate}%`, 190, finalY + 7, { align: 'right' });
    
    doc.text('Tax', 140, finalY + 14);
    doc.text(tax.toLocaleString(), 190, finalY + 14, { align: 'right' });
    
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.5);
    doc.line(140, finalY + 18, 190, finalY + 18);
    
    doc.setFontSize(12);
    doc.text('Total', 140, finalY + 25);
    doc.text(total.toLocaleString(), 190, finalY + 25, { align: 'right' });
    
    // Notes
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('Please deliver within 5 business days.', 20, finalY + 7);
    
    // Save PO to database
    if (user) {
      apiService.post('purchase_orders', { ...newPO, companyId: user.uid }).catch(err => {
        console.error("Error saving PO to database:", err);
      });
    }

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(0, 119, 182);
    doc.text('b-hub.co.tz', 20, 285);
    
    doc.save(`Purchase_Order_${poNumber}.pdf`);
  };

  const EXPENSE_CATEGORIES = ['Rent', 'Salaries', 'Electricity', 'Water', 'Transport', 'Marketing', 'Maintenance', 'Other'];

  const handleSaveExpense = async () => {
    if (!expenseFormData.description || !expenseFormData.amount || !user) return;
    const newExpense: Expense = {
      id: Date.now().toString(),
      companyId: auth.currentUser?.uid || user.uid || '',
      description: expenseFormData.description,
      amount: Number(expenseFormData.amount),
      category: expenseFormData.category || 'Other',
      date: expenseFormData.date || new Date().toISOString().split('T')[0],
      paymentMode: expenseFormData.paymentMode || 'Cash'
    };
    try {
      const saved = await apiService.post('expenses', newExpense);
      setExpenses(prev => [...prev, saved]);
      setShowExpenseModal(false);
      setExpenseFormData({ description: '', amount: 0, category: 'Rent', date: new Date().toISOString().split('T')[0], paymentMode: 'Cash' });
    } catch (err) {
      console.error("Error saving expense:", err);
      console.error("Failed to save expense", err);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({ 
      category: 'Beer > Local Beers', 
      wholesaleUnitSize: 12, 
      numCartons: 0,
      stock: 0, 
      retailPrice: 0, 
      wholesalePrice: 0, 
      costPrice: 0,
      buyingPricePerCarton: 0,
      margin: 0,
      wholesaleMargin: 0,
      image: '',
      discount: '',
      barcode: '',
      expiryDate: '',
      batchNumber: '',
      reorderLevel: 10
    });
    setShowModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    const margin = product.margin || (product.costPrice ? ((product.retailPrice - product.costPrice) / product.costPrice) * 100 : 0);
    const wholesaleMargin = product.wholesaleMargin || (product.buyingPricePerCarton ? ((product.wholesalePrice - product.buyingPricePerCarton) / product.buyingPricePerCarton) * 100 : 0);
    const buyingPricePerCarton = product.buyingPricePerCarton || (product.costPrice * product.wholesaleUnitSize);
    setFormData({ 
      ...product, 
      margin,
      wholesaleMargin,
      buyingPricePerCarton,
      numCartons: product.numCartons || Math.floor(product.stock / product.wholesaleUnitSize) 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingProduct) {
      try {
        const updated = await apiService.post('products', { ...formData, id: editingProduct.id });
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        setShowModal(false);
      } catch (err) {
        console.error("Error updating product:", err);
        console.error("Failed to update product", err);
      }
    } else {
      const initialBatch: Batch = {
        id: Date.now().toString(),
        batchNumber: formData.batchNumber || `B-${new Date().getFullYear()}-001`,
        expiryDate: formData.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stock: Number(formData.stock) || 0,
        buyingPricePerCarton: Number(formData.buyingPricePerCarton) || 0,
        costPrice: Number(formData.costPrice) || 0,
        dateAdded: new Date().toISOString()
      };

      const product: Product = {
        id: Math.random().toString(36).substr(2, 9),
        companyId: auth.currentUser?.uid || user.uid || '',
        name: formData.name || '',
        category: formData.category || 'Beer > Local Beers',
        retailPrice: Number(formData.retailPrice) || 0,
        wholesalePrice: Number(formData.wholesalePrice) || 0,
        costPrice: Number(formData.costPrice) || 0,
        buyingPricePerCarton: Number(formData.buyingPricePerCarton) || 0,
        margin: Number(formData.margin) || 0,
        wholesaleMargin: Number(formData.wholesaleMargin) || 0,
        wholesaleUnitSize: Number(formData.wholesaleUnitSize) || 12,
        numCartons: Number(formData.numCartons) || 0,
        stock: Number(formData.stock) || 0,
        image: formData.image || `https://picsum.photos/seed/${formData.name}/300/300`,
        discount: formData.discount || '0% OFF',
        barcode: formData.barcode || '',
        expiryDate: formData.expiryDate || '',
        batchNumber: formData.batchNumber || '',
        reorderLevel: Number(formData.reorderLevel) || 0,
        batches: [initialBatch]
      };
      
      try {
        const saved = await apiService.post('products', product);
        setProducts(prev => [...prev, saved]);
        setShowModal(false);
      } catch (err) {
        console.error("Error saving product:", err);
      }
    }
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check for 1MB (1024 * 1024 bytes)
    if (file.size > 1024 * 1024) {
      setImageError("File size must not exceed 1MB.");
      return;
    }
    setImageError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          setFormData({ ...formData, image: canvas.toDataURL('image/jpeg', 0.8) });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startScanner = async () => {
    setShowScanner(true);
    setScannerError(null);
    setTimeout(async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser does not support camera access. Please try a different browser or upload an image.");
        }

        const html5QrCode = new Html5Qrcode("scanner-container");
        scannerRef.current = html5QrCode;
        
        const config = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            return {
              width: Math.floor(viewfinderWidth * 0.8),
              height: Math.floor(viewfinderHeight * 0.3)
            };
          },
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            setFormData(prev => ({ ...prev, barcode: decodedText }));
            stopScanner();
          },
          () => {}
        ).catch(async (err) => {
          console.warn("Retrying with default camera due to constraint error:", err);
          // Fallback to front camera if environment-facing fails
          await html5QrCode.start(
            { facingMode: "user" }, 
            config,
            (decodedText) => {
              setFormData(prev => ({ ...prev, barcode: decodedText }));
              stopScanner();
            },
            () => {}
          );
        });
      } catch (err: any) {
        console.error("Scanner error:", err);
        const errorMsg = err.toString();
        if (err.name === 'NotAllowedError' || errorMsg.includes('Permission denied') || errorMsg.includes('Permission dismissed')) {
          setScannerError("Camera access was denied. This usually happens because browsers block camera access inside preview windows. Click 'Open in New Tab' below to fix this and grant permission.");
        } else if (err.name === 'NotFoundError' || errorMsg.includes('Requested device not found')) {
          setScannerError("No camera found on this device. Please try uploading an image of the barcode instead.");
        } else {
          setScannerError(err.message || "Could not start scanner. Please ensure your device has a camera and you are using a secure connection (HTTPS).");
        }
      }
    }, 100);
  };

  const handleBarcodeFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("scanner-container", false);
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      setFormData(prev => ({ ...prev, barcode: decodedText }));
      stopScanner();
    } catch (err) {
      console.error("File scan error:", err);
      setScannerError("Could not find a valid barcode in the image. Please try a clearer photo.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
      scannerRef.current = null;
    }
    setShowScanner(false);
    setIsFlashlightOn(false);
  };

  const toggleFlashlight = async () => {
    if (scannerRef.current) {
      try {
        const newState = !isFlashlightOn;
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: newState }] as any
        });
        setIsFlashlightOn(newState);
      } catch (err) {
        console.error("Failed to toggle flashlight:", err);
      }
    }
  };

  const handleRestock = async () => {
    if (!restockingProduct || !user) return;
    const amountToAdd = restockType === 'cartons' 
      ? Number(restockAmount) * restockingProduct.wholesaleUnitSize 
      : Number(restockAmount);
    
    const newBatch: Batch = {
      id: Date.now().toString(),
      batchNumber: restockBatch.batchNumber || `B-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      expiryDate: restockBatch.expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      stock: amountToAdd,
      buyingPricePerCarton: restockBatch.buyingPricePerCarton || restockingProduct.buyingPricePerCarton,
      costPrice: (restockBatch.buyingPricePerCarton || restockingProduct.buyingPricePerCarton) / restockingProduct.wholesaleUnitSize,
      dateAdded: new Date().toISOString()
    };

    const updatedProduct = { 
      ...restockingProduct, 
      stock: restockingProduct.stock + amountToAdd, 
      numCartons: Math.floor((restockingProduct.stock + amountToAdd) / restockingProduct.wholesaleUnitSize),
      batches: [...(restockingProduct.batches || []), newBatch],
      expiryDate: newBatch.expiryDate,
      batchNumber: newBatch.batchNumber
    };

    try {
      await apiService.post('products', updatedProduct);
      setProducts(prev => prev.map(p => p.id === restockingProduct.id ? updatedProduct : p));
      setRestockingProduct(null);
      setRestockAmount(0);
      setRestockBatch({ batchNumber: '', expiryDate: '', buyingPricePerCarton: 0 });
    } catch (err) {
      console.error("Error restocking product:", err);
      console.error("Failed to restock product", err);
    }
  };

  const handleReceivePO = async (po: PurchaseOrder) => {
    if (!user) return;
    // 1. Update stock and add batches
    const updatedProductsList: Product[] = [];
    
    for (const p of products) {
      const receivedItem = receivedItems[p.id];
      if (!receivedItem) continue;
      
      const qtyInPcs = receivedItem.qty * p.wholesaleUnitSize;
      const costPerPc = receivedItem.cost / p.wholesaleUnitSize;
      
      const newBatch: Batch = {
        id: Date.now().toString() + Math.random(),
        batchNumber: `RCV-${po.id}`,
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stock: qtyInPcs,
        buyingPricePerCarton: receivedItem.cost,
        costPrice: costPerPc,
        dateAdded: new Date().toISOString()
      };

      updatedProductsList.push({
        ...p,
        stock: p.stock + qtyInPcs,
        costPrice: costPerPc,
        buyingPricePerCarton: receivedItem.cost,
        batches: [...(p.batches || []), newBatch]
      });
    }

    try {
      for (const product of updatedProductsList) {
        await apiService.post('products', product);
      }
      
      const updatedPO: PurchaseOrder = { ...po, status: 'Received' };
      await apiService.post('purchase_orders', { ...updatedPO, companyId: user.uid });

      setProducts(prev => prev.map(p => {
        const updated = updatedProductsList.find(up => up.id === p.id);
        return updated || p;
      }));
      setPurchaseOrders(prev => prev.map(p => p.id === po.id ? updatedPO : p));
      
      setShowReceiveInventoryModal(false);
      setSelectedPOId(null);
      setReceivedItems({});
    } catch (err) {
      console.error("Error receiving PO:", err);
      console.error("Failed to receive inventory", err);
    }
  };

  return (
    <div className="py-6 space-y-8 pb-24 px-0 sm:px-6">
      <div className="px-6 sm:px-0">
        <PermissionBanner />
        <UserGuideBanner 
          role="manager"
          title="Store Management" 
          description="Manage your store's core operations here. Add or edit products, record operational expenses, manage your vendor list, and generate purchase orders for restocking." 
        />
      </div>
      <div className="flex justify-between items-center px-6 sm:px-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Store Manager</h1>
          <p className="text-gray-400">Inventory & Sales Overview</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-[#0077B6] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#005f8a] transition-all"
        >
          <Plus size={20} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 sm:px-0">
        {/* Inventory Asset Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => setShowFinancialDetail('inventory_asset')}
          className="bg-[#1E293B] p-4 rounded-[24px] border border-gray-800 relative overflow-hidden group shadow-xl cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-purple-500/10 transition-all duration-500" />
          <div className="relative z-10 space-y-2">
            <div className="bg-purple-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-purple-500">
              <BarChart3 size={16} />
            </div>
            <div>
              <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Inventory Asset</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] font-bold text-purple-900/50">TSh</span>
                <p className="text-base font-black text-white tracking-tight">{Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(stockValue)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Total Profit Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setShowFinancialDetail('profit')}
          className="bg-[#1E293B] p-4 rounded-[24px] border border-gray-800 relative overflow-hidden group shadow-xl cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-green-500/10 transition-all duration-500" />
          <div className="relative z-10 space-y-2">
            <div className="bg-green-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-green-500">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Net Profit</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] font-bold text-green-900/50">TSh</span>
                <p className={`text-base font-black tracking-tight ${actualNetProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(actualNetProfit)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Accounts Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setShowFinancialDetail('accounts')}
          className="bg-[#1E293B] p-4 rounded-[24px] border border-gray-800 relative overflow-hidden group shadow-xl cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-blue-500/10 transition-all duration-500" />
          <div className="relative z-10 space-y-2">
            <div className="bg-blue-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-blue-500">
              <DollarSign size={16} />
            </div>
            <div>
              <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Accounts</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] font-bold text-blue-900/50">TSh</span>
                <p className={`text-base font-black tracking-tight ${totalCashBank >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(totalCashBank)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Expired Products Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1E293B] p-4 rounded-[24px] border border-gray-800 relative overflow-hidden group shadow-xl"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-red-500/10 transition-all duration-500" />
          <div className="relative z-10 space-y-2">
            <div className="bg-red-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-red-500">
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Expired Cost</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] font-bold text-red-900/50">TSh</span>
                <p className="text-base font-black tracking-tight text-red-400">
                  {Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(expiredCost)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Management Tools Section */}
      <div className="px-6 sm:px-0 space-y-3">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Management Tools</h3>
        <div className="grid grid-cols-3 gap-2">
          {/* Record Expense Card */}
          <button 
            onClick={() => setShowExpensesDashboardModal(true)}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-[#1E293B] border border-gray-800 rounded-2xl hover:bg-[#2D3748] transition-all active:scale-95 group shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-12 h-12 bg-[#0077B6]/5 rounded-full -mr-4 -mt-4 blur-xl group-hover:bg-[#0077B6]/10 transition-all" />
            <div className="bg-[#0077B6]/10 p-3 rounded-xl text-[#0077B6] group-hover:bg-[#0077B6] group-hover:text-white transition-all">
              <DollarSign size={20} />
            </div>
            <div className="text-center space-y-0.5">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Expense</span>
              <span className="text-xs font-black text-white">TSh {Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(totalExpenses)}</span>
            </div>
          </button>

          {/* Purchase Order Card */}
          <button 
            onClick={() => {
              const initialDrafts: any = {};
              reorderProducts.forEach(p => {
                const suggestedPcs = (p.reorderLevel * 2) - p.stock;
                initialDrafts[p.id] = {
                  qty: Math.ceil(suggestedPcs / p.wholesaleUnitSize),
                  cost: p.buyingPricePerCarton
                };
              });
              setPoDraftItems(initialDrafts);
              setShowPurchaseOrderModal(true);
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-[#1E293B] border border-gray-800 rounded-2xl hover:bg-[#2D3748] transition-all active:scale-95 group shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-12 h-12 bg-orange-500/5 rounded-full -mr-4 -mt-4 blur-xl group-hover:bg-orange-500/10 transition-all" />
            <div className="bg-orange-500/10 p-3 rounded-xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all relative">
              <ShoppingCart size={20} />
              {reorderProducts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#1E293B] animate-pulse">
                  {reorderProducts.length}
                </span>
              )}
            </div>
            <div className="text-center space-y-0.5">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Orders</span>
              <span className="text-xs font-black text-white">{reorderProducts.length} to Order</span>
            </div>
          </button>

          {/* Receive Inventory Card */}
          <button 
            onClick={() => setShowReceiveInventoryModal(true)}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-[#1E293B] border border-gray-800 rounded-2xl hover:bg-[#2D3748] transition-all active:scale-95 group shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-12 h-12 bg-green-500/5 rounded-full -mr-4 -mt-4 blur-xl group-hover:bg-green-500/10 transition-all" />
            <div className="bg-green-500/10 p-3 rounded-xl text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all relative">
              <PackagePlus size={20} />
              {purchaseOrders.filter(po => po.status === 'Pending').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#1E293B]">
                  {purchaseOrders.filter(po => po.status === 'Pending').length}
                </span>
              )}
            </div>
            <div className="text-center space-y-0.5">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Receive</span>
              <span className="text-xs font-black text-white">{purchaseOrders.filter(po => po.status === 'Pending').length} Pending</span>
            </div>
          </button>
        </div>
      </div>




      <FinancialDetailModal 
        isOpen={showFinancialDetail !== null} 
        onClose={() => setShowFinancialDetail(null)}
        type={showFinancialDetail as any}
        user={user}
        onUpdateUser={async (data) => {
          if (!user?.uid) return;
          try {
            await apiService.post('users', { 
              ...data, 
              uid: user?.uid,
              email: user?.email,
              name: user?.name,
              role: user?.role
            });
            setUser(prev => prev ? { ...prev, ...data } : null);
          } catch (err) {
            console.error("Error updating user setting:", err);
          }
        }}
        data={
          showFinancialDetail === 'profit' ? {
            revenue: actualRevenue,
            vat: actualVat,
            vatApplicable: user.isVatApplicable,
            vatRate: user.vatRate || 18,
            cogs: actualCOGS,
            opex: totalExpenses,
            expiredCost: expiredCost,
            netProfit: actualNetProfit
          } : showFinancialDetail === 'inventory_asset' ? {
            value: stockValue,
            products: products
          } : showFinancialDetail === 'expenses' ? {
            categories: EXPENSE_CATEGORIES.map(cat => ({
              name: cat,
              amount: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
            })).sort((a, b) => b.amount - a.amount)
          } : showFinancialDetail === 'accounts' ? {
            balances: accountBalances,
            total: totalCashBank
          } : {
            cash: actualRevenue - totalExpenses
          }
        }
      />

      {/* Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1E293B] w-full max-w-md rounded-[32px] overflow-hidden border border-gray-800 shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0B172A]">
                <h3 className="text-xl font-bold text-white">Record Expense</h3>
                <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-white p-2">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Description</label>
                  <input 
                    className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                    value={expenseFormData.description}
                    onChange={e => setExpenseFormData({...expenseFormData, description: e.target.value})}
                    placeholder="e.g. Monthly Rent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Amount (TSh)</label>
                    <input 
                      type="number"
                      className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={expenseFormData.amount || ''}
                      onChange={e => setExpenseFormData({...expenseFormData, amount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Category</label>
                    <select 
                      className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none appearance-none"
                      value={expenseFormData.category}
                      onChange={e => setExpenseFormData({...expenseFormData, category: e.target.value})}
                    >
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Payment Mode</label>
                  <select 
                    className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none appearance-none"
                    value={expenseFormData.paymentMode}
                    onChange={e => setExpenseFormData({...expenseFormData, paymentMode: e.target.value})}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Payment">Mobile Payment</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Date</label>
                  <input 
                    type="date"
                    className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                    value={expenseFormData.date}
                    onChange={e => setExpenseFormData({...expenseFormData, date: e.target.value})}
                  />
                </div>
                <button 
                  onClick={handleSaveExpense}
                  className="w-full bg-[#0077B6] text-white py-4 rounded-2xl font-bold text-lg mt-4 hover:bg-[#005f8a] transition-all shadow-lg shadow-[#0077B6]/20"
                >
                  Save Expense
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expenses Dashboard Modal */}
      <AnimatePresence>
        {showExpensesDashboardModal && (
          <div className="fixed inset-0 bg-[#0B172A] z-[70] flex flex-col">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex flex-col h-full w-full bg-[#0B172A]"
            >
              <div className="safe-top bg-[#1E293B] border-b border-gray-800 px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-lg mt-3">
                <button onClick={() => setShowExpensesDashboardModal(false)} className="p-2 -ml-2 text-gray-400 hover:text-white">
                  <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">Operational Expenses</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Financial Tracking</p>
                </div>
                <button 
                  onClick={() => setShowExpenseModal(true)}
                  className="bg-[#0077B6] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#005f8a] transition-all"
                >
                  <Plus size={14} /> Add Expense
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
                {/* Expense Filters & Search */}
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#0077B6] transition-colors">
                        <Search size={18} />
                      </div>
                      <input 
                        type="text"
                        placeholder="Search expenses..."
                        className="w-full bg-[#1E293B] border border-gray-800 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#0077B6] focus:border-transparent outline-none transition-all shadow-lg"
                        value={expenseSearch}
                        onChange={(e) => setExpenseSearch(e.target.value)}
                      />
                    </div>
                    
                    <button 
                      onClick={exportToPDF}
                      className="bg-[#0077B6] text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#005F91] transition-all shadow-lg shadow-[#0077B6]/20 active:scale-95"
                    >
                      <FileText size={18} />
                      <span>Export PDF Report</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">From Date</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="date" 
                          className="w-full bg-[#1E293B] border border-gray-800 rounded-xl py-2.5 pl-9 pr-3 text-white text-xs outline-none focus:ring-1 focus:ring-[#0077B6] transition-all"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">To Date</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="date" 
                          className="w-full bg-[#1E293B] border border-gray-800 rounded-xl py-2.5 pl-9 pr-3 text-white text-xs outline-none focus:ring-1 focus:ring-[#0077B6] transition-all"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                    {['All', ...EXPENSE_CATEGORIES].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setExpenseCategoryFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                          expenseCategoryFilter === cat 
                            ? 'bg-[#0077B6] text-white border-[#0077B6] shadow-lg shadow-[#0077B6]/20' 
                            : 'bg-[#1E293B] text-gray-400 border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#1E293B] rounded-[32px] border border-gray-800 overflow-hidden shadow-2xl">
                    <div className="p-6 bg-[#0B172A]/50 border-b border-gray-800 flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                        {expenseCategoryFilter === 'All' ? 'Recent Expenses' : `${expenseCategoryFilter} Expenses`}
                      </span>
                      <span className="text-sm font-black text-red-400">Total: TSh {filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</span>
                    </div>
                    <div className="divide-y divide-gray-800">
                      {filteredExpenses.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto text-gray-600">
                            <Package size={32} />
                          </div>
                          <p className="text-gray-500 text-sm italic">No expenses found matching your criteria.</p>
                        </div>
                      ) : (
                        <>
                          {(showAllExpenses ? filteredExpenses : filteredExpenses.slice(expensePage * 10, (expensePage * 10) + 10)).map(expense => (
                            <div key={expense.id} className="p-5 flex justify-between items-center hover:bg-white/5 transition-colors group">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-white group-hover:text-[#0077B6] transition-colors">{expense.description}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md uppercase font-black tracking-wider">{expense.category}</span>
                                  <span className="text-[10px] text-gray-500 font-medium">{new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <p className="text-sm font-black text-red-400">- TSh {expense.amount.toLocaleString()}</p>
                                <button 
                                  onClick={() => setExpenses(prev => prev.filter(e => e.id !== expense.id))}
                                  className="text-[10px] text-gray-600 hover:text-red-500 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {!showAllExpenses && filteredExpenses.length > 10 && (
                            <div className="p-6 bg-[#0B172A]/30 flex items-center justify-between border-t border-gray-800">
                              <div className="flex gap-2">
                                <button 
                                  disabled={expensePage === 0}
                                  onClick={() => setExpensePage(p => Math.max(0, p - 1))}
                                  className="w-12 h-12 bg-gray-800 text-white rounded-2xl flex items-center justify-center disabled:opacity-30 hover:bg-gray-700 transition-all shadow-md"
                                >
                                  <ChevronLeft size={24} />
                                </button>
                                <div className="flex items-center px-4 text-sm font-bold text-gray-500">
                                  Page {expensePage + 1} of {Math.ceil(filteredExpenses.length / 10)}
                                </div>
                                <button 
                                  disabled={(expensePage + 1) * 10 >= filteredExpenses.length}
                                  onClick={() => setExpensePage(p => p + 1)}
                                  className="w-12 h-12 bg-gray-800 text-white rounded-2xl flex items-center justify-center disabled:opacity-30 hover:bg-gray-700 transition-all shadow-md"
                                >
                                  <ChevronRight size={24} />
                                </button>
                              </div>
                              <button 
                                onClick={() => setShowAllExpenses(true)}
                                className="text-[#0077B6] text-xs font-black uppercase tracking-widest hover:underline px-2"
                              >
                                View All
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Vendor Modal */}
      <AnimatePresence>
        {showAddVendorModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1E293B] w-full max-w-md rounded-[32px] overflow-hidden border border-gray-800 shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0B172A]">
                <h3 className="text-xl font-bold text-white">Add New Vendor</h3>
                <button onClick={() => setShowAddVendorModal(false)} className="text-gray-400 hover:text-white p-2">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Vendor Name</label>
                  <input 
                    className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                    value={vendorFormData.name}
                    onChange={e => setVendorFormData({...vendorFormData, name: e.target.value})}
                    placeholder="e.g. Global Beverages Ltd"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 ml-1">Address</label>
                  <input 
                    className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                    value={vendorFormData.address}
                    onChange={e => setVendorFormData({...vendorFormData, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Phone</label>
                    <input 
                      className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={vendorFormData.phone}
                      onChange={e => setVendorFormData({...vendorFormData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Email</label>
                    <input 
                      type="email"
                      className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={vendorFormData.email}
                      onChange={e => setVendorFormData({...vendorFormData, email: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (!vendorFormData.name || !user) return;
                    const newVendor: Vendor = {
                      id: Date.now().toString(),
                      companyId: auth.currentUser?.uid || user.uid || '',
                      name: vendorFormData.name,
                      address: vendorFormData.address || '',
                      cityState: vendorFormData.cityState || '',
                      postalCode: vendorFormData.postalCode || '',
                      phone: vendorFormData.phone || '',
                      email: vendorFormData.email || ''
                    };
                    try {
                      const saved = await apiService.post('vendors', newVendor);
                      setVendors(prev => [...prev, saved]);
                      setSelectedVendorId(newVendor.id);
                      setShowAddVendorModal(false);
                      setVendorFormData({ name: '', address: '', cityState: '', postalCode: '', phone: '', email: '' });
                    } catch (err) {
                      console.error("Error saving vendor:", err);
                      console.error("Failed to save vendor", err);
                    }
                  }}
                  className="w-full bg-[#0077B6] text-white py-4 rounded-2xl font-bold text-lg mt-4 hover:bg-[#005f8a] transition-all shadow-lg shadow-[#0077B6]/20"
                >
                  Save Vendor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purchase Order Modal */}
      <AnimatePresence>
        {showReceiveInventoryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1E293B] w-full max-w-3xl rounded-[32px] overflow-hidden border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0B172A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                    <PackagePlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Receive Inventory</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Update Stock from Purchase Orders</p>
                  </div>
                </div>
                <button onClick={() => {
                  setShowReceiveInventoryModal(false);
                  setSelectedPOId(null);
                  setReceivedItems({});
                }} className="text-gray-400 hover:text-white p-2">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!selectedPOId ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Pending Purchase Orders</h4>
                    {purchaseOrders.filter(po => po.status === 'Pending').length === 0 ? (
                      <div className="py-20 text-center space-y-4 bg-[#0B172A]/30 rounded-3xl border border-dashed border-gray-800">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-600">
                          <ShoppingCart size={32} />
                        </div>
                        <p className="text-gray-500 text-sm">No pending purchase orders found.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {purchaseOrders.filter(po => po.status === 'Pending').map(po => (
                          <button
                            key={po.id}
                            onClick={() => {
                              setSelectedPOId(po.id);
                              const initialReceived: any = {};
                              po.items.forEach(item => {
                                initialReceived[item.productId] = { qty: item.quantity, cost: item.costPricePerCarton };
                              });
                              setReceivedItems(initialReceived);
                            }}
                            className="p-5 bg-[#0B172A] border border-gray-800 rounded-2xl hover:border-[#0077B6] transition-all text-left flex justify-between items-center group"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-white group-hover:text-[#0077B6] transition-colors">{po.id}</p>
                              <p className="text-xs text-gray-500">{po.vendorName} • {new Date(po.date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-white">TSh {po.totalAmount.toLocaleString()}</p>
                              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">{po.items.length} Items</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedPOId(null)} className="text-gray-400 hover:text-white">
                        <ChevronLeft size={20} />
                      </button>
                      <div>
                        <h4 className="text-sm font-bold text-white">Receiving {selectedPOId}</h4>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                          {purchaseOrders.find(p => p.id === selectedPOId)?.vendorName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {purchaseOrders.find(p => p.id === selectedPOId)?.items.map(item => (
                        <div key={item.productId} className="p-4 bg-[#0B172A] border border-gray-800 rounded-2xl space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-white">{item.productName}</p>
                              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Ordered: {item.quantity} Cartons</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Current Cost</p>
                              <p className="text-xs font-bold text-gray-400">TSh {item.costPricePerCarton.toLocaleString()} / ctn</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Received Qty (Cartons)</label>
                              <input 
                                type="number"
                                className="w-full bg-[#1E293B] border border-gray-700 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:ring-1 focus:ring-green-500"
                                value={receivedItems[item.productId]?.qty || ''}
                                onChange={(e) => setReceivedItems({
                                  ...receivedItems,
                                  [item.productId]: { ...receivedItems[item.productId], qty: Number(e.target.value) }
                                })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Actual Cost (TSh/Ctn)</label>
                              <input 
                                type="number"
                                className="w-full bg-[#1E293B] border border-gray-700 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:ring-1 focus:ring-green-500"
                                value={receivedItems[item.productId]?.cost || ''}
                                onChange={(e) => setReceivedItems({
                                  ...receivedItems,
                                  [item.productId]: { ...receivedItems[item.productId], cost: Number(e.target.value) }
                                })}
                              />
                            </div>
                          </div>
                          
                          {receivedItems[item.productId]?.cost !== item.costPricePerCarton && (
                            <div className="flex items-center gap-2 text-[10px] font-bold">
                              <AlertTriangle size={12} className="text-orange-500" />
                              <span className={receivedItems[item.productId]?.cost > item.costPricePerCarton ? 'text-red-400' : 'text-green-400'}>
                                Price Variance: TSh {(receivedItems[item.productId]?.cost - item.costPricePerCarton).toLocaleString()} per carton
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-[#0B172A] border-t border-gray-800 flex gap-3">
                <button 
                  onClick={() => {
                    setShowReceiveInventoryModal(false);
                    setSelectedPOId(null);
                    setReceivedItems({});
                  }}
                  className="flex-1 bg-gray-800 text-white py-4 rounded-2xl font-bold hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                {selectedPOId && (
                  <button 
                    onClick={() => handleReceivePO(purchaseOrders.find(p => p.id === selectedPOId)!)}
                    className="flex-[2] bg-green-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                  >
                    <PackagePlus size={20} />
                    Confirm Reception
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPurchaseOrderModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1E293B] w-full h-full overflow-hidden border border-gray-800 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0B172A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Purchase Order</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Low Stock Items List</p>
                  </div>
                </div>
                <button onClick={() => setShowPurchaseOrderModal(false)} className="text-gray-400 hover:text-white p-2">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Vendor Selection */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Vendor</label>
                    <button 
                      onClick={() => setShowAddVendorModal(true)}
                      className="text-[#0077B6] text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> Add New Vendor
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vendors.map(vendor => (
                      <button
                        key={vendor.id}
                        onClick={() => setSelectedVendorId(vendor.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedVendorId === vendor.id 
                            ? 'bg-[#0077B6]/10 border-[#0077B6] shadow-lg shadow-[#0077B6]/10' 
                            : 'bg-[#0B172A] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <p className={`text-sm font-bold ${selectedVendorId === vendor.id ? 'text-[#0077B6]' : 'text-white'}`}>{vendor.name}</p>
                        <p className="text-[10px] text-gray-500 mt-1 truncate">{vendor.address}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {reorderProducts.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                      <Package size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-bold">All Stock Levels Healthy</p>
                      <p className="text-gray-500 text-sm">No items are currently below their reorder level.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
                      <Info size={18} className="text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-200/70 leading-relaxed">
                        The following items have fallen below their <span className="text-orange-500 font-bold">Reorder Level</span>. 
                        Suggested order quantities are calculated to bring stock back to a safe level.
                      </p>
                    </div>

                    <div className="divide-y divide-gray-800 border border-gray-800 rounded-2xl overflow-hidden">
                      {reorderProducts.map(product => {
                        const suggestedPcs = (product.reorderLevel * 2) - product.stock;
                        const suggestedCtns = Math.ceil(suggestedPcs / product.wholesaleUnitSize);
                        
                        return (
                          <div key={product.id} className="p-4 bg-[#0B172A]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{product.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded uppercase font-black">{product.category}</span>
                                  <span className="text-[10px] text-red-400 font-bold">Stock: {product.stock} Pcs</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-gray-800 pt-3 sm:pt-0 w-full sm:w-auto">
                              <div className="text-right w-full sm:w-auto flex justify-between sm:block">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Reorder Level</p>
                                <p className="text-sm font-black text-white">{product.reorderLevel} Pcs</p>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <div className="space-y-1 flex-1 sm:w-24">
                                  <label className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Qty (Ctns)</label>
                                  <input 
                                    type="number"
                                    className="w-full bg-[#1E293B] border border-gray-700 rounded-xl py-2 px-3 text-white text-sm outline-none focus:ring-1 focus:ring-orange-500"
                                    value={poDraftItems[product.id]?.qty ?? suggestedCtns}
                                    onChange={(e) => setPoDraftItems({
                                      ...poDraftItems,
                                      [product.id]: { ...poDraftItems[product.id], qty: Number(e.target.value) }
                                    })}
                                  />
                                </div>
                                <div className="space-y-1 flex-1 sm:w-32">
                                  <label className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Price (TSh)</label>
                                  <input 
                                    type="number"
                                    className="w-full bg-[#1E293B] border border-gray-700 rounded-xl py-2 px-3 text-white text-sm outline-none focus:ring-1 focus:ring-orange-500"
                                    value={poDraftItems[product.id]?.cost ?? product.buyingPricePerCarton}
                                    onChange={(e) => setPoDraftItems({
                                      ...poDraftItems,
                                      [product.id]: { ...poDraftItems[product.id], cost: Number(e.target.value) }
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-[#0B172A] border-t border-gray-800 flex gap-3">
                <button 
                  onClick={() => setShowPurchaseOrderModal(false)}
                  className="flex-1 bg-gray-800 text-white py-4 rounded-2xl font-bold hover:bg-gray-700 transition-all"
                >
                  Close
                </button>
                {reorderProducts.length > 0 && (
                  <button 
                    onClick={exportPurchaseOrderPDF}
                    className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                  >
                    <Send size={20} />
                    Send Purchase Order
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-[#1E293B] sm:rounded-3xl border-y sm:border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-white">Inventory Status</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sort By:</span>
              <select 
                value={inventorySort}
                onChange={(e) => setInventorySort(e.target.value)}
                className="bg-[#0B172A] text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-700 outline-none focus:ring-1 focus:ring-[#0077B6]"
              >
                <option value="default">Default</option>
                <option value="expiry">Near Expiry</option>
                <option value="sales">Most Purchased</option>
                <option value="profit">Highest Profit</option>
                <option value="stock">Low Stock</option>
              </select>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {Object.keys(CATEGORIES).map(cat => (
              <button
                key={cat}
                onClick={() => setInventoryFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  inventoryFilter === cat 
                    ? 'bg-[#0077B6] text-white border-[#0077B6] shadow-lg shadow-[#0077B6]/20' 
                    : 'bg-[#0B172A] text-gray-400 border-gray-700 hover:border-gray-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-800">
                <th className="p-6 font-medium min-w-[250px]">Product</th>
                <th className="p-6 font-medium">Batch</th>
                <th className="p-6 font-medium">Stock (Pcs)</th>
                <th className="p-6 font-medium">Expiry</th>
                <th className="p-6 font-medium">Retail</th>
                <th className="p-6 font-medium">Wholesale</th>
                <th className="p-6 font-medium">Cost/PC</th>
                <th className="p-6 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredProducts.map(product => (
                <tr key={product.id} className="text-gray-200 hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <img src={product.image} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <p className="font-medium whitespace-normal line-clamp-2">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500 truncate">{product.category}</p>
                          {productSales[product.id] > 0 && (
                            <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 font-bold">
                              <TrendingUp size={10} /> {productSales[product.id]} sold
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-xs font-mono text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                      {product.batchNumber || 'N/A'}
                    </span>
                  </td>
                  <td className="p-6 font-mono">{product.stock}</td>
                  <td className="p-6">
                    {product.expiryDate ? (
                      <div className="flex flex-col">
                        {(() => {
                          const days = Math.ceil((new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          let color = 'text-green-400';
                          let bg = 'bg-green-500/10';
                          let label = `${Math.floor(days/30)}m left`;
                          
                          if (days <= 0) {
                            color = 'text-red-500';
                            bg = 'bg-red-500/20';
                            label = 'EXPIRED';
                          } else if (days <= 60) {
                            color = 'text-red-400';
                            bg = 'bg-red-500/10';
                            label = `${days}d (Discount!)`;
                          } else if (days <= 180) {
                            color = 'text-orange-400';
                            bg = 'bg-orange-500/10';
                            label = `${Math.floor(days/30)}m left`;
                          }

                          return (
                            <div className={`flex flex-col items-start`}>
                              <span className="text-xs text-white mb-1">{new Date(product.expiryDate).toLocaleDateString()}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${color} ${bg}`}>
                                {label}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-6 font-mono text-sm whitespace-nowrap">TSh {Number(product.retailPrice || 0).toLocaleString()}</td>
                  <td className="p-6 font-mono text-sm whitespace-nowrap">TSh {Number(product.wholesalePrice || 0).toLocaleString()}</td>
                  <td className="p-6 font-mono text-sm whitespace-nowrap text-gray-400">TSh {Number(product.costPrice || 0).toLocaleString()}</td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => setRestockingProduct(product)}
                        className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                        title="Restock Item"
                      >
                        <PackagePlus size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(product)}
                        className="p-2 text-[#0077B6] hover:bg-[#0077B6]/10 rounded-lg transition-all"
                        title="Edit Item"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      <AnimatePresence>
        {restockingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1E293B] w-full max-w-md rounded-[32px] overflow-hidden border border-gray-800 shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0B172A]">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/10 p-2 rounded-xl text-green-500">
                    <PackagePlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Restock Item</h3>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{restockingProduct.name}</p>
                  </div>
                </div>
                <button onClick={() => setRestockingProduct(null)} className="text-gray-400 hover:text-white p-2">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-[#0B172A] p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Stock</p>
                    <p className="text-xl font-black text-white">{restockingProduct.stock} <span className="text-xs font-normal text-gray-500">Pcs</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">In Cartons</p>
                    <p className="text-xl font-black text-white">{Math.floor(restockingProduct.stock / restockingProduct.wholesaleUnitSize)} <span className="text-xs font-normal text-gray-500">ctn</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex bg-[#0B172A] p-1 rounded-2xl border border-gray-800">
                    <button 
                      onClick={() => setRestockType('cartons')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${restockType === 'cartons' ? 'bg-[#0077B6] text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                      By Cartons
                    </button>
                    <button 
                      onClick={() => setRestockType('pcs')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${restockType === 'pcs' ? 'bg-[#0077B6] text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                    >
                      By Pieces
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 ml-1">
                        Amount ({restockType === 'cartons' ? 'Cartons' : 'Pieces'})
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          autoFocus
                          className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white text-xl font-black focus:ring-2 focus:ring-green-500 outline-none transition-all"
                          value={restockAmount || ''}
                          onChange={e => setRestockAmount(Number(e.target.value))}
                          placeholder="0"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                          {restockType === 'cartons' ? 'ctn' : 'pcs'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 ml-1">Buying Price/Ctn</label>
                      <input 
                        type="number"
                        className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                        value={restockBatch.buyingPricePerCarton || ''}
                        onChange={e => setRestockBatch({...restockBatch, buyingPricePerCarton: Number(e.target.value)})}
                        placeholder={(restockingProduct.buyingPricePerCarton ?? '0').toString()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 ml-1">Batch Number</label>
                      <input 
                        className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        value={restockBatch.batchNumber}
                        onChange={e => setRestockBatch({...restockBatch, batchNumber: e.target.value})}
                        placeholder="e.g. B-2024-X"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 ml-1">Expiry Date</label>
                      <input 
                        type="date"
                        className="w-full bg-[#0B172A] border border-gray-700 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        value={restockBatch.expiryDate}
                        onChange={e => setRestockBatch({...restockBatch, expiryDate: e.target.value})}
                      />
                    </div>
                  </div>

                  {restockType === 'cartons' && (
                    <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 space-y-2">
                      <div className="flex items-center gap-3">
                        <Info size={16} className="text-[#0077B6] shrink-0" />
                        <p className="text-[10px] text-gray-400 leading-tight">
                          1 Carton = <span className="text-white font-bold">{restockingProduct.wholesaleUnitSize}</span> pieces.
                        </p>
                      </div>
                      <div className="flex items-center justify-between pl-7">
                        <p className="text-[10px] text-gray-500">
                          Adding <span className="text-white font-bold">{restockAmount || 0}</span> ctn = <span className="text-[#0077B6] font-bold">{(restockAmount || 0) * restockingProduct.wholesaleUnitSize}</span> pcs.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleRestock}
                    disabled={!restockAmount || restockAmount <= 0}
                    className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <PackagePlus size={22} />
                    Confirm Restock
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showModal && (
        <div className="fixed inset-0 bg-[#0B172A] z-50 flex flex-col">
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col h-full w-full bg-[#0B172A]"
          >
            {/* --- STICKY HEADER --- */}
            <div className="safe-top bg-[#1E293B] border-b border-gray-800 px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-lg">
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 -ml-2 text-gray-400 hover:text-white active:scale-90 transition-transform"
              >
                <ArrowLeft size={24} />
              </button>
              <h3 className="text-lg font-bold text-white flex-1 truncate">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              {editingProduct && (
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setRestockingProduct(editingProduct);
                  }}
                  className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-green-600 transition-all"
                >
                  <PackagePlus size={14} /> Restock
                </button>
              )}
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 -mr-2 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto pb-32">
              <form id="product-form" onSubmit={handleSubmit} className="p-6 space-y-8 max-w-2xl mx-auto">
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                  {/* --- SECTION: BASIC DETAILS --- */}
                  <div className="col-span-2 flex items-center gap-3">
                    <span className="text-[11px] font-black text-[#0077B6] uppercase tracking-[0.25em] whitespace-nowrap">Basic Details</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#0077B6]/30 to-transparent"></div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Product Name</label>
                    <input 
                      required
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none transition-all placeholder:text-gray-600"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter product name..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Primary Category</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none appearance-none cursor-pointer"
                        value={formData.category?.split(' > ')[0] || Object.keys(CATEGORIES)[0]}
                        onChange={e => setFormData({ ...formData, category: `${e.target.value} > ${CATEGORIES[e.target.value as keyof typeof CATEGORIES][0]}` })}
                      >
                        {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Secondary Category</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none appearance-none cursor-pointer"
                        value={formData.category?.split(' > ')[1] || CATEGORIES[Object.keys(CATEGORIES)[0] as keyof typeof CATEGORIES][0]}
                        onChange={e => setFormData({ ...formData, category: `${formData.category?.split(' > ')[0] || Object.keys(CATEGORIES)[0]} > ${e.target.value}` })}
                      >
                        {(() => {
                          const primary = formData.category?.split(' > ')[0] || Object.keys(CATEGORIES)[0];
                          const options = (CATEGORIES as any)[primary];
                          return Array.isArray(options) ? options.map(c => <option key={c} value={c}>{c}</option>) : null;
                        })()}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Expiry Date</label>
                    <input 
                      type="date"
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none transition-all"
                      value={formData.expiryDate || ''}
                      onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Batch Number</label>
                    <input 
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none transition-all placeholder:text-gray-600"
                      value={formData.batchNumber || ''}
                      onChange={e => setFormData({...formData, batchNumber: e.target.value})}
                      placeholder="e.g. B-2024-001"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Barcode (Optional)</label>
                    <div className="flex gap-2">
                      <input 
                        className="flex-1 bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none placeholder:text-gray-600"
                        value={formData.barcode || ''}
                        onChange={e => setFormData({...formData, barcode: e.target.value})}
                        placeholder="Scan/Enter"
                      />
                      <button 
                        type="button"
                        onClick={startScanner}
                        className="bg-[#0077B6] text-white p-4 rounded-2xl hover:bg-[#005f8a] active:scale-95 transition-all shadow-lg shadow-[#0077B6]/20"
                      >
                        <Scan size={20} />
                      </button>
                    </div>
                  </div>

                  {/* --- SECTION: INVENTORY (QUANTITIES) --- */}
                  <div className="col-span-2 flex items-center gap-3 pt-4">
                    <span className="text-[11px] font-black text-[#0077B6] uppercase tracking-[0.25em] whitespace-nowrap">Inventory & Stock</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#0077B6]/30 to-transparent"></div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Number of Cartons</label>
                    <CalcInput 
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={formData.numCartons || 0}
                      onChange={(val: number) => {
                        const newStock = val * (formData.wholesaleUnitSize || 0);
                        setFormData({...formData, numCartons: val, stock: newStock});
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Pcs per Carton</label>
                    <CalcInput 
                      required
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={formData.wholesaleUnitSize}
                      onChange={(val: number) => {
                        const newStock = (formData.numCartons || 0) * val;
                        const costPerPc = (formData.buyingPricePerCarton || 0) / (val || 1);
                        const retailPrice = costPerPc * (1 + (formData.margin || 0) / 100);
                        setFormData({...formData, wholesaleUnitSize: val, stock: newStock, costPrice: costPerPc, retailPrice});
                      }}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-[#0077B6] ml-1">Total Stock (Pcs)</label>
                    <div className="relative group">
                      <CalcInput 
                        required
                        className="w-full bg-[#0077B6]/5 border-2 border-[#0077B6]/20 rounded-2xl p-5 text-white focus:ring-2 focus:ring-[#0077B6] outline-none font-bold text-xl"
                        value={formData.stock}
                        onChange={(val: number) => setFormData({...formData, stock: val})}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#0077B6] bg-[#0077B6]/10 px-2 py-1 rounded-md">
                        AUTO-CALC
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-orange-500 ml-1">Reorder Level (Pcs)</label>
                    <div className="relative group">
                      <CalcInput 
                        required
                        className="w-full bg-orange-500/5 border-2 border-orange-500/20 rounded-2xl p-5 text-white focus:ring-2 focus:ring-orange-500 outline-none font-bold text-xl"
                        value={formData.reorderLevel || 0}
                        onChange={(val: number) => setFormData({...formData, reorderLevel: val})}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                        Low Stock Alert
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 ml-1 italic">When stock falls below this level, the item will appear in the Purchase Order list.</p>
                  </div>

                  {/* --- SECTION: PRICING (MONEY) --- */}
                  <div className="col-span-2 flex items-center gap-3 pt-4">
                    <span className="text-[11px] font-black text-[#0077B6] uppercase tracking-[0.25em] whitespace-nowrap">Pricing & Finance</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#0077B6]/30 to-transparent"></div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Buying Price per Carton</label>
                    <CalcInput 
                      required
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={formData.buyingPricePerCarton}
                      onChange={(val: number) => {
                        const costPerPc = val / (formData.wholesaleUnitSize || 1);
                        const retailPrice = costPerPc * (1 + (formData.margin || 0) / 100);
                        const wholesalePrice = val * (1 + (formData.wholesaleMargin || 0) / 100);
                        setFormData({ ...formData, buyingPricePerCarton: val, costPrice: costPerPc, retailPrice, wholesalePrice });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Cost/PC (Calculated)</label>
                    <div className="relative group">
                      <CalcInput 
                        required
                        className="w-full bg-[#0077B6]/5 border-2 border-[#0077B6]/20 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none font-bold"
                        value={formData.costPrice}
                        onChange={(val: number) => setFormData({...formData, costPrice: val})}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#0077B6] bg-[#0077B6]/10 px-2 py-1 rounded-md">
                        AUTO
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Margin (%)</label>
                    <CalcInput 
                      required
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={formData.margin}
                      onChange={(val: number) => {
                        const retailPrice = (formData.costPrice || 0) * (1 + val / 100);
                        setFormData({ ...formData, margin: val, retailPrice: Math.round(retailPrice) });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Retail Sale Price (Pcs)</label>
                    <CalcInput 
                      required
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={formData.retailPrice}
                      onChange={(val: number) => {
                        const margin = formData.costPrice ? ((val - formData.costPrice) / formData.costPrice) * 100 : 0;
                        setFormData({ ...formData, retailPrice: val, margin: parseFloat(margin.toFixed(2)) });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Wholesale Margin (%)</label>
                    <CalcInput 
                      required
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={formData.wholesaleMargin}
                      onChange={(val: number) => {
                        const wholesalePrice = (formData.buyingPricePerCarton || 0) * (1 + val / 100);
                        setFormData({ ...formData, wholesaleMargin: val, wholesalePrice: Math.round(wholesalePrice) });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Wholesale Price per (Ctn)</label>
                    <CalcInput 
                      required
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none"
                      value={formData.wholesalePrice}
                      onChange={(val: number) => {
                        const wholesaleMargin = formData.buyingPricePerCarton ? ((val - formData.buyingPricePerCarton) / formData.buyingPricePerCarton) * 100 : 0;
                        setFormData({ ...formData, wholesalePrice: val, wholesaleMargin: parseFloat(wholesaleMargin.toFixed(2)) });
                      }}
                    />
                  </div>

                  {/* --- SECTION: PROFIT ANALYSIS (PROFESSIONAL FEATURE) --- */}
                  <div className="col-span-2 grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-[#0077B6]/5 border border-[#0077B6]/20 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-[#0077B6] uppercase tracking-wider mb-1">Profit / Piece</p>
                      <p className="text-lg font-black text-white">
                        TSh {Math.max(0, (formData.retailPrice || 0) - (formData.costPrice || 0)).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-[#0077B6]/5 border border-[#0077B6]/20 rounded-2xl p-4">
                      <p className="text-[10px] font-bold text-[#0077B6] uppercase tracking-wider mb-1">Profit / Carton (Wholesale)</p>
                      <p className="text-lg font-black text-white">
                        TSh {Math.max(0, (formData.wholesalePrice || 0) - (formData.buyingPricePerCarton || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Discount Tag (Optional)</label>
                    <input 
                      className="w-full bg-[#1E293B] border border-gray-700 rounded-2xl p-4 text-white focus:ring-2 focus:ring-[#0077B6] outline-none placeholder:text-gray-600"
                      value={formData.discount || ''}
                      onChange={e => setFormData({...formData, discount: e.target.value})}
                      placeholder="e.g. 10% OFF"
                    />
                  </div>

                  {/* --- SECTION: MEDIA --- */}
                  <div className="col-span-2 flex items-center gap-3 pt-4">
                    <span className="text-[11px] font-black text-[#0077B6] uppercase tracking-[0.25em] whitespace-nowrap">Media</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#0077B6]/30 to-transparent"></div>
                  </div>

                  <div className="col-span-2 space-y-3">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Product Image</label>
                    <div className="flex items-center gap-6 bg-[#1E293B] p-6 rounded-[32px] border border-gray-700 shadow-inner">
                      <div className="w-28 h-28 rounded-3xl bg-[#0B172A] border-2 border-dashed border-gray-700 overflow-hidden flex items-center justify-center relative group shrink-0">
                        {formData.image ? (
                          <img src={formData.image} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <ImageIcon className="text-gray-700" size={40} />
                        )}
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white backdrop-blur-sm"
                        >
                          <Upload size={28} />
                        </button>
                      </div>
                      <div className="flex-1 space-y-3">
                        <p className="text-xs text-gray-500 leading-relaxed">High-quality square photo recommended (Max 1MB).</p>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-[#0077B6]/10 text-[#0077B6] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#0077B6]/20 transition-all flex items-center gap-2 w-fit"
                        >
                          <Upload size={14} /> {formData.image ? 'Change Photo' : 'Upload Square Photo'}
                        </button>
                        {imageError && (
                          <p className="text-red-500 text-[10px] font-bold">{imageError}</p>
                        )}
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={handleImageCapture}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* --- STICKY FOOTER --- */}
            <div className="safe-bottom p-6 bg-[#1E293B] border-t border-gray-800 flex gap-3 sticky bottom-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
              {editingProduct && (
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setRestockingProduct(editingProduct);
                  }}
                  className="flex-1 bg-green-500 text-white px-4 py-4 rounded-2xl font-bold hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <PackagePlus size={20} /> Restock
                </button>
              )}
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-800 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="product-form"
                className="flex-[2] bg-[#0077B6] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#005f8a] active:scale-[0.98] transition-all shadow-xl shadow-[#0077B6]/30 flex items-center justify-center gap-2"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col">
          <div className="p-6 flex justify-between items-center bg-[#1E293B]">
            <h3 className="text-white font-bold">Scan Barcode</h3>
            <div className="flex items-center gap-4">
              <button onClick={toggleFlashlight} className="text-white p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                {isFlashlightOn ? <Flashlight size={20} className="text-yellow-400" /> : <FlashlightOff size={20} />}
              </button>
              <button onClick={stopScanner} className="text-white p-2"><X /></button>
            </div>
          </div>
          <div className="flex-1 relative bg-black flex items-center justify-center p-4">
            {scannerError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-red-500/10 rounded-2xl border border-red-500/20 max-w-md w-full">
                <div className="bg-red-500/20 p-4 rounded-full text-red-500 mb-4">
                  <X size={32} />
                </div>
                <p className="text-white font-medium mb-2">Scanner Issue</p>
                <p className="text-gray-400 text-sm mb-6">{scannerError}</p>
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => {
                      setScannerError(null);
                      startScanner();
                    }}
                    className="bg-[#0077B6] text-white px-6 py-2 rounded-full font-bold hover:bg-[#005f8a] transition-colors w-full"
                  >
                    Try Camera Again
                  </button>
                  <button 
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors w-full flex items-center justify-center gap-2 relative"
                  >
                    <ExternalLink size={18} />
                    Open in New Tab
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                      Recommended
                    </span>
                  </button>
                  <button 
                    onClick={() => barcodeFileInputRef.current?.click()}
                    className="bg-[#1E293B] text-white px-6 py-2 rounded-full font-bold border border-gray-700 hover:border-[#0077B6] transition-all w-full flex items-center justify-center gap-2"
                  >
                    <ImageIcon size={18} />
                    Scan from Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-md aspect-square">
                <div id="scanner-container" className="w-full h-full overflow-hidden rounded-3xl border-2 border-[#0077B6]"></div>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[80%] h-[30%] border-2 border-[#0077B6] relative rounded-lg">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-8 bg-[#1E293B] text-center flex flex-col gap-4">
            {!scannerError && (
              <>
                <p className="text-gray-400 text-sm">Align the barcode within the frame to scan</p>
                <div className="h-px bg-gray-800 w-full max-w-xs mx-auto"></div>
                <button 
                  onClick={() => barcodeFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 text-[#0077B6] hover:text-[#00B4D8] transition-colors font-medium py-2"
                >
                  <ImageIcon size={18} />
                  Scan from Image instead
                </button>
              </>
            )}
            <input 
              type="file" 
              ref={barcodeFileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleBarcodeFileScan}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const AuthScreen = ({ externalError, setUser, onGuest }: { externalError?: string | null, setUser: (user: UserProfile | null) => void, onGuest: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isManagerMode, setIsManagerMode] = useState(false);

  useEffect(() => {
    if (externalError) {
      setError(externalError);
      setIsLoading(false);
    }
  }, [externalError]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || (isRegistering && !name)) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        const newProfile: UserProfile = {
          uid: 'user-' + Math.random().toString(36).substr(2, 9),
          email: `${phone}@b-hub.com`,
          phone,
          password,
          name,
          role: 'client',
        };
        const result = await apiService.post('users', newProfile);
        localStorage.setItem('customUser', JSON.stringify(result));
        setUser(result);
      } else {
        const payload = isManagerMode ? { phone, password } : { email: phone, password };
        const result = await apiService.post('login', payload);
        
        if (isManagerMode && result.role !== 'manager') {

          throw new Error("Invalid manager credentials");
        }
        
        localStorage.setItem('customUser', JSON.stringify(result));
        setUser(result);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col">
        <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm sticky top-0 z-50">
          <button 
            onClick={() => setIsRegistering(false)} 
            className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-900 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Create Account</h2>
          <div className="w-10"></div>
        </header>

        <div className="flex-grow flex flex-col items-center justify-center p-6 space-y-8 max-w-sm mx-auto w-full">
          <div className="text-center space-y-2">
            <h1 className="text-[64px] font-black text-[#ff6b00] tracking-tighter italic leading-none">b-hub</h1>
          </div>

          <div className="w-full bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-900">New Customer</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <input 
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-900 outline-none focus:border-[#ff6b00] text-lg font-medium"
              />
              <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden bg-gray-50 focus-within:border-[#ff6b00] transition-all">
                <div className="px-5 py-4 border-r-2 border-gray-100 text-gray-900 font-bold bg-white flex items-center">
                  +255
                </div>
                <input 
                  type="text"
                  placeholder="Enter mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-grow p-4 bg-transparent outline-none text-gray-900 text-lg font-medium"
                />
              </div>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-gray-900 outline-none focus:border-[#ff6b00] text-lg font-medium transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff6b00]"
                >
                  <Search size={22} />
                </button>
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-white border-2 border-gray-200 text-gray-900 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center"
              >
                {isLoading ? <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" /> : 'Sign up'}
              </button>
              {error && <p className="text-red-500 text-xs text-center font-bold bg-red-50 p-2 rounded-lg">{error}</p>}
            </form>
            <button onClick={() => setIsRegistering(false)} className="w-full text-center text-sm text-[#ff6b00] font-bold">
              Already a customer? Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col">
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <button 
          onClick={onGuest} 
          className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-900 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Login</h2>
        <div className="w-10"></div>
      </header>

      <div className="flex-grow p-4 space-y-4">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center space-y-8">
        <h1 className="text-[64px] font-black text-[#ff6b00] tracking-tighter italic leading-none">b-hub</h1>
        
        <div className="w-full space-y-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 tracking-tight">New Customer</h2>
          <button 
            onClick={() => setIsRegistering(true)}
            className="w-full bg-white border-2 border-gray-200 text-gray-900 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all"
          >
            Sign up
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center space-y-8 flex-grow">
        <div className="w-full space-y-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 tracking-tight">
            {isManagerMode ? 'Store Manager Login' : 'Existing Customer'}
          </h2>
          
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden bg-gray-50 focus-within:border-[#ff6b00] focus-within:bg-white transition-all">
              <div className="px-6 py-5 border-r-2 border-gray-100 text-gray-900 font-bold bg-white flex items-center">
                +255
              </div>
              <input 
                type="text"
                placeholder="Enter mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-grow p-5 bg-transparent outline-none text-gray-900 text-xl font-bold"
              />
            </div>

            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-gray-900 outline-none focus:border-[#ff6b00] focus:bg-white text-xl font-bold transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff6b00]"
              >
                <Search size={26} />
              </button>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !phone || !password}
              className={`w-full py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center ${
                !phone || !password ? 'bg-[#F1F5F9] text-gray-400 cursor-not-allowed border-2 border-gray-100' : 'bg-[#E2E8F0] text-gray-600 hover:bg-[#CBD5E1]'
              }`}
            >
              {isLoading ? <div className="w-6 h-6 border-3 border-gray-400 border-t-transparent rounded-full animate-spin" /> : 'Login'}
            </button>
          </form>

          <div className="text-center pt-2 space-y-4">
            <button type="button" className="text-[#ff6b00] font-black text-xl tracking-tight hover:underline block w-full">Forgot Password?</button>
            <button 
              type="button"
              onClick={() => setIsManagerMode(!isManagerMode)}
              className="text-gray-500 font-bold text-sm tracking-tight hover:text-[#ff6b00] underline block w-full"
            >
              {isManagerMode ? 'Back to Customer Login' : 'Login as Store Manager'}
            </button>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
        </div>
      </div>
    </div>
  </div>
  );
};

const Header = ({ user, handleLogout, setIsProfileOpen, searchQuery, setSearchQuery, cartCount }: any) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const categoryQuery = searchParams.get('category');

  if (location.pathname === '/manager') {
    return null;
  }

  if (location.pathname === '/products') {
    return null;
  }

  if (location.pathname === '/') {
    return (
      <header className="bg-white sticky top-0 z-40 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
            <MapPin size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400">Delivery to</span>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="text-sm font-black text-gray-900 border-b border-dashed border-gray-900">Mikocheni Area, Dar-es-sala..</span>
              <ChevronDown size={14} className="text-gray-900" />
            </div>
          </div>
        </div>
        <button className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 relative">
          {/* Notification / Alert Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
      </header>
    );
  }

  return (
    <header className="bg-white sticky top-0 z-40 p-4 border-b border-gray-100 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="What are we having?" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-lg py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/20" 
          />
        </div>
        
        <button 
          onClick={() => navigate('/cart')}
          className="relative p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-gray-600 active:scale-95 transition-all"
        >
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

const AppRedirectHandler = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (user?.role === 'manager') {
      navigate('/manager');
    }
  }, [user, navigate]);
  return null;
};

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isWholesale, setIsWholesale] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('beverage_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<UserProfile>>({});
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (showSettingsModal && user) {
      setSettingsForm({
        businessName: user.businessName || '',
        address: user.address || '',
        cityState: user.cityState || '',
        postalCode: user.postalCode || '',
        tinNumber: user.tinNumber || '',
        isVatApplicable: user.isVatApplicable || false,
        vatRate: user.vatRate || 18,
        includeReceivableInRevenue: user.includeReceivableInRevenue || false
      });
    }
  }, [showSettingsModal, user]);

  const handleSaveSettings = async () => {
    if (!user?.uid) {
      console.error("Cannot save settings: User UID is missing");
      return;
    }
    setIsSavingSettings(true);
    try {
      const updateData = {
        businessName: settingsForm.businessName || '',
        address: settingsForm.address || '',
        cityState: settingsForm.cityState || '',
        postalCode: settingsForm.postalCode || '',
        tinNumber: settingsForm.tinNumber || '',
        isVatApplicable: settingsForm.isVatApplicable || false,
        vatRate: settingsForm.vatRate || 18,
        includeReceivableInRevenue: settingsForm.includeReceivableInRevenue || false
      };

      // Use apiService to update user profile
      // We must include email and other required fields for the upsert to work
      await apiService.post('users', { 
        ...updateData, 
        uid: user?.uid,
        email: user?.email,
        name: user?.name,
        role: user?.role
      });
      
      // Update local user state immediately to reflect changes and close modal
      const updatedUser = { ...user, ...updateData };
      setUser(updatedUser);
      localStorage.setItem('customUser', JSON.stringify(updatedUser));
      setShowSettingsModal(false);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      const errorMessage = err?.message || (err?.toString?.() || "Unknown error");
      alert(`Failed to save settings: ${errorMessage}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isProfileIncomplete = false;

  const isFormValid = true;

  // We are removing the automatic opening of the settings modal on incomplete profile
  useEffect(() => {
    if (isProfileIncomplete) {
      setShowSettingsModal(true);
    }
  }, [isProfileIncomplete]);

  const handleClearAllData = async () => {
    if (!window.confirm('Are you sure you want to clear ALL store data? This will permanently delete all products, sales, expenses, orders, and customers. This action cannot be undone.')) {
      return;
    }

    setIsClearingData(true);
    try {
      if (!user?.uid) return;
      const companyId = user.uid;

      // Clear Products
      const productsToClear = await apiService.get('products', { companyId });
      for (const d of productsToClear) await apiService.delete('products', d.id);

      // Clear Sales
      const salesToClear = await apiService.get('sales', { companyId });
      for (const d of salesToClear) await apiService.delete('sales', d.id);

      // Clear Expenses
      const expensesToClear = await apiService.get('expenses', { companyId });
      for (const d of expensesToClear) await apiService.delete('expenses', d.id);

      // Clear Orders
      const ordersToClear = await apiService.get('orders', { companyId });
      for (const d of ordersToClear) await apiService.delete('orders', d.id);

      // Clear Customers
      const customersToClear = await apiService.get('customers', { companyId });
      for (const d of customersToClear) await apiService.delete('customers', d.id);

      // Clear Vendors
      const vendorsToClear = await apiService.get('vendors', { companyId });
      for (const d of vendorsToClear) await apiService.delete('vendors', d.id);

      // Clear Purchase Orders
      const poToClear = await apiService.get('purchase_orders', { companyId });
      for (const d of poToClear) await apiService.delete('purchase_orders', d.id);

      alert('All store data has been cleared successfully.');
      setShowSettingsModal(false);
    } catch (err) {
      console.error('Error clearing data:', err);
      alert('Failed to clear data. Please try again.');
    } finally {
      setIsClearingData(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('customUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setIsAuthReady(true);
      } catch (e) {
        localStorage.removeItem('customUser');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError(null);
      if (firebaseUser) {
        try {
          const users = await apiService.get('users', { uid: firebaseUser.uid });
          const existingUser = users[0] as UserProfile | undefined;
          const intendedRole = localStorage.getItem('intendedRole') as 'manager' | 'client' | null;

          if (existingUser) {
            // If they are trying to "Create a Store" but already have a client account
            if (intendedRole === 'manager' && existingUser?.role === 'client') {
              setAuthError("This email is already registered as a Customer. Please sign in as a Customer or use a different email for your Store.");
              await signOut(auth);
              setUser(null);
            } else if (intendedRole === 'client' && existingUser?.role === 'manager') {
              // If they are trying to sign in as client but are a manager
              setUser(existingUser);
            } else {
              setUser(existingUser);
            }
          } else {
            // New User - Check if email exists
            const allUsers = await apiService.get('users');
            const emailExists = allUsers.some((u: any) => u.email === firebaseUser.email);
            
            if (emailExists) {
              setAuthError("This email is already registered with another account. Please sign in with your original Google account.");
              await signOut(auth);
              setUser(null);
            } else {
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'User',
                role: intendedRole || (firebaseUser.email === 'businesscasto@gmail.com' ? 'manager' : 'client'),
              };
              await apiService.post('users', newProfile);
              setUser(newProfile);
            }
          }
          localStorage.removeItem('intendedRole');
        } catch (err: any) {
          console.error("Auth error:", err);
          let message = "Authentication failed. Please try again.";
          try {
            const parsed = JSON.parse(err.message);
            if (parsed.error) message = parsed.error;
          } catch (e) {
            // Not JSON, use original message if it's a string
            if (typeof err.message === 'string' && err.message.length < 100) message = err.message;
          }
          setAuthError(message);
          await signOut(auth);
        }
      } else {
        const savedUser = localStorage.getItem('customUser');
        if (!savedUser) {
          setUser(null);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('beverage_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const isManager = user?.role === 'manager';
    const currentUid = user?.uid;
    const companyId = isManager ? currentUid : (user?.companyId || '');

    const fetchData = async () => {
      // Use the known company ID for this app if the user is a guest or no company is set
      const activeCompanyId = companyId || localStorage.getItem('last_managed_company_id') || 'h9cpJbV4yTYw7JynoHvMvaBjpX33';
      
      if (isManager && currentUid) {
        localStorage.setItem('last_managed_company_id', currentUid);
      }
      
      if (!activeCompanyId) return;
      
      try {
        console.log(`[DATA] Fetching products for ${isManager ? 'manager' : 'client'}...`);
        const [p, o] = await Promise.all([
          // For products, let's always fetch all products for now to ensure consistency, 
          // or at least make sure managers see everything in the store.
          apiService.get('products', {}), 
          apiService.get('orders', isManager ? { companyId: activeCompanyId } : { customerName: user?.name || '' })
        ]);
        
        if (Array.isArray(p)) {
          console.log(`[DATA] Received ${p.length} products`);
          setProducts(p);
        }
        if (Array.isArray(o)) {
          setOrders(o);
        }

        if (isManager) {
          const [s, e, c, v, po] = await Promise.all([
            apiService.get('sales', { companyId }),
            apiService.get('expenses', { companyId }),
            apiService.get('customers', { companyId }),
            apiService.get('vendors', { companyId }),
            apiService.get('purchase_orders', { companyId })
          ]);
          setSales(s);
          setExpenses(e);
          setCustomers(c);
          setVendors(v);
          setPurchaseOrders(po);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Fallback poll every 10 seconds just in case

    // Real-time synchronization
    const eventSource = new EventSource('/api/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          fetchData(); // instantly fetch whenever DB is modified via SSE
        }
      } catch (err) {}
    };

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, [user]);

  const [userApiKey, setUserApiKey] = useState<string>(localStorage.getItem('GOOGLE_MAPS_API_KEY') || "");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // @ts-ignore
  const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const activeApiKey = (envApiKey && envApiKey !== "your_api_key_here" && envApiKey !== "AIzaSyANXgw02rPWOY9DWMKtgrclXSTE3k9DoNU") ? envApiKey : userApiKey;

  const saveApiKey = (key: string) => {
    localStorage.setItem('GOOGLE_MAPS_API_KEY', key);
    setUserApiKey(key);
    setIsConfigOpen(false);
    window.location.reload(); // Reload to ensure Google Maps script re-initializes with new key
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('customUser');
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const addToCart = (item: Omit<CartItem, 'id' | 'quantity'>) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === item.productId && i.isWholesale === item.isWholesale);
      if (existing) {
        return prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, id: Date.now(), quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handleDirectOrder = async (item: Omit<CartItem, 'id'>, customer: Customer) => {
    const productIndex = products.findIndex(p => p.id === item.productId);
    if (productIndex === -1) return;

    const product = { ...products[productIndex] };
    const quantity = item.isWholesale ? product.wholesaleUnitSize : 1;
    
    if (product.stock >= quantity) {
      const updatedBatches = [...(product.batches || [])].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
      let remaining = quantity;
      const newSales: Sale[] = [];

      const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

      for (let i = 0; i < updatedBatches.length; i++) {
        if (remaining <= 0) break;
        if (updatedBatches[i].stock > 0) {
          const toDeduct = Math.min(updatedBatches[i].stock, remaining);
          updatedBatches[i].stock -= toDeduct;
          remaining -= toDeduct;
          
          newSales.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            companyId: auth.currentUser?.uid || user.uid || '',
            productId: product.id,
            productName: product.name,
            quantity: toDeduct,
            type: item.isWholesale ? 'wholesale' : 'retail',
            salePrice: item.price / (item.isWholesale ? product.wholesaleUnitSize : 1),
            costPrice: updatedBatches[i].costPrice,
            timestamp: new Date().toISOString(),
            batchId: updatedBatches[i].id,
            orderId: orderId
          });
        }
      }

      const newOrder: Order = {
        id: orderId,
        companyId: auth.currentUser?.uid || user.uid || '',
        customerName: customer.name,
        items: [{ ...item, id: Date.now() }],
        subtotal: item.price,
        transportCost: 0,
        discountAmount: 0,
        discountType: 'percentage',
        totalCost: item.price,
        status: 'Delivered',
        paymentStatus: 'Unpaid',
        driverName: 'In-Store',
        destinationAddress: 'In-Store',
        timestamp: new Date().toISOString(),
        vehicle: 'None'
      };

      try {
        const updatedProduct = {
          ...product,
          stock: updatedBatches.reduce((sum, b) => sum + b.stock, 0),
          batches: updatedBatches
        };
        await apiService.post('products', updatedProduct);
        
        const savedSales = [];
        for (const sale of newSales) {
          const saved = await apiService.post('sales', sale);
          savedSales.push(saved);
        }
        const savedOrder = await apiService.post('orders', newOrder);

        // Update local state
        setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));
        setSales(prev => [...prev, ...savedSales]);
        setOrders(prev => [...prev, savedOrder]);
      } catch (err) {
        console.error("Error in direct order:", err);
      }
    }
  };

  const handleCheckout = async (orderDetails: { 
    customerName: string; 
    subtotal: number; 
    transportCost: number; 
    discountAmount: number;
    discountType: 'percentage' | 'flat';
    totalCost: number; 
    destinationAddress: string; 
    vehicle: string; 
    driverName: string;
    paymentMode: string;
  }) => {
    if (!user || cart.length === 0) return;
    
    // All items in cart should belong to the same company because of the filtered view
    const companyId = products.find(p => p.id === cart[0].productId)?.companyId || auth.currentUser?.uid || user?.uid || '';

    const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newSales: Sale[] = [];
    const updatedProducts = [...products];

    for (const item of cart) {
      const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (productIndex !== -1) {
        const product = { ...updatedProducts[productIndex] };
        const quantity = item.isWholesale ? product.wholesaleUnitSize : 1;
        
        if (product.stock >= quantity) {
          let remaining = quantity;
          const sortedBatches = [...(product.batches || [])].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
          
          for (let i = 0; i < sortedBatches.length; i++) {
            if (remaining <= 0) break;
            if (sortedBatches[i].stock > 0) {
              const toDeduct = Math.min(sortedBatches[i].stock, remaining);
              sortedBatches[i].stock -= toDeduct;
              remaining -= toDeduct;
              
              newSales.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                companyId: companyId,
                productId: product.id,
                productName: product.name,
                quantity: toDeduct,
                type: item.isWholesale ? 'wholesale' : 'retail',
                salePrice: item.price / (item.isWholesale ? product.wholesaleUnitSize : 1),
                costPrice: sortedBatches[i].costPrice,
                timestamp: new Date().toISOString(),
                batchId: sortedBatches[i].id,
                discountAmount: orderDetails.discountAmount / cart.length,
                discountType: orderDetails.discountType,
                paymentMode: orderDetails.paymentMode,
                orderId: orderId
              });
            }
          }
          
          product.batches = sortedBatches;
          product.stock = sortedBatches.reduce((sum, b) => sum + b.stock, 0);
          updatedProducts[productIndex] = product;
        }
      }
    }

    const newOrder: Order = {
      id: orderId,
      companyId: companyId,
      customerName: orderDetails.customerName,
      items: [...cart],
      subtotal: orderDetails.subtotal,
      transportCost: orderDetails.transportCost,
      discountAmount: orderDetails.discountAmount,
      discountType: orderDetails.discountType,
      totalCost: orderDetails.totalCost,
      status: 'Pending',
      paymentStatus: 'Paid',
      paymentMode: orderDetails.paymentMode,
      driverName: orderDetails.driverName,
      destinationAddress: orderDetails.destinationAddress,
      timestamp: new Date().toISOString(),
      vehicle: orderDetails.vehicle
    };

    try {
      for (const product of updatedProducts) {
        await apiService.post('products', {
          ...product,
          stock: product.stock,
          batches: product.batches
        });
      }
      for (const sale of newSales) {
        await apiService.post('sales', sale);
      }
      const savedOrder = await apiService.post('orders', newOrder);
      
      setProducts(prev => prev.map(p => {
        const updated = updatedProducts.find(up => up.id === p.id);
        return updated || p;
      }));
      setSales(prev => [...prev, ...newSales]);
      setOrders(prev => [...prev, savedOrder]);
      setCart([]);
    } catch (err) {
      console.error("Error in checkout:", err);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleReceivePayment = async (customerName: string, paymentMode: string) => {
    const unpaidOrders = orders.filter(o => o.customerName === customerName && o.paymentStatus === 'Unpaid');
    try {
      const updatedOrders = [];
      for (const order of unpaidOrders) {
        const updated = await apiService.post('orders', {
          ...order,
          paymentStatus: 'Paid',
          paymentMode
        });
        updatedOrders.push(updated);
      }
      setOrders(prev => prev.map(o => {
        const updated = updatedOrders.find(uo => uo.id === o.id);
        return updated || o;
      }));
    } catch (err) {
      console.error("Error receiving payment:", err);
    }
  };

  const handleDeleteOrderGroup = async (group: GroupedOrder) => {
    try {
      const ordersToDelete = group.orders.filter(o => o.paymentStatus === 'Unpaid');
      
      for (const order of ordersToDelete) {
        // Find sales for this order
        const sales = await apiService.get('sales', { companyId: auth.currentUser?.uid || user?.uid || '' });
        const orderTime = new Date(order.timestamp).getTime();
        
        const salesToDelete = sales.filter((sale: Sale) => {
          if (sale.orderId === order.id) return true;
          // Fallback for older orders without orderId
          const saleTime = new Date(sale.timestamp).getTime();
          return Math.abs(saleTime - orderTime) < 10000;
        });

        // Rollback stock using sales records for accuracy
        const salesByProduct: Record<string, Sale[]> = {};
        for (const sale of salesToDelete) {
          if (!salesByProduct[sale.productId]) {
            salesByProduct[sale.productId] = [];
          }
          salesByProduct[sale.productId].push(sale);
        }

        const updatedProductsList: Product[] = [];
        for (const productId in salesByProduct) {
          const product = (await apiService.get('products', { id: productId }))[0];
          if (product) {
            let updatedBatches = [...(product.batches || [])];
            let totalRestoredForProduct = 0;

            for (const sale of salesByProduct[productId]) {
              const batchIndex = updatedBatches.findIndex(b => b.id === sale.batchId);
              if (batchIndex >= 0) {
                updatedBatches[batchIndex].stock += sale.quantity;
              } else {
                if (updatedBatches.length > 0) {
                  updatedBatches[0].stock += sale.quantity;
                } else {
                  updatedBatches.push({
                    id: sale.batchId || Date.now().toString(),
                    batchNumber: 'RESTORED',
                    expiryDate: '',
                    buyingPricePerCarton: product.costPrice * product.wholesaleUnitSize,
                    stock: sale.quantity,
                    costPrice: sale.costPrice || product.costPrice,
                    dateAdded: new Date().toISOString()
                  });
                }
              }
              totalRestoredForProduct += sale.quantity;
            }

            const updatedProduct = {
              ...product,
              stock: product.stock + totalRestoredForProduct,
              batches: updatedBatches
            };
            await apiService.post('products', updatedProduct);
            updatedProductsList.push(updatedProduct);
          }
        }

        // Delete sales
        for (const sale of salesToDelete) {
          await apiService.delete('sales', sale.id);
        }

        // Delete order
        await apiService.delete('orders', order.id);
        
        // Update local state for products and sales
        setProducts(prev => prev.map(p => {
          const updated = updatedProductsList.find(up => up.id === p.id);
          return updated || p;
        }));
        setSales(prev => prev.filter(s => !salesToDelete.some(st => st.id === s.id)));
      }
      
      // Update local state for orders
      setOrders(prev => prev.filter(o => !ordersToDelete.some(ot => ot.id === o.id)));
    } catch (err) {
      console.error("Error deleting order group:", err);
    }
  };

  const handleDeleteOrderItem = async (group: GroupedOrder, productId: string, isWholesale: boolean) => {
    try {
      // Find the first order that contains this item
      let targetOrder: Order | null = null;
      let targetItemIndex = -1;

      for (const order of group.orders) {
        if (order.paymentStatus !== 'Unpaid') continue;
        targetItemIndex = order.items.findIndex(item => item.productId === productId && item.isWholesale === isWholesale);
        if (targetItemIndex !== -1) {
          targetOrder = order;
          break;
        }
      }

      if (!targetOrder) return;

      const targetItem = targetOrder.items[targetItemIndex];

      // 1. Rollback stock
      const product = (await apiService.get('products', { id: productId }))[0];
      
      // Find ONE sale record to delete
      const sales = await apiService.get('sales', { 
        companyId: auth.currentUser?.uid || user?.uid || '',
        productId: productId
      });
      
      const orderTime = new Date(targetOrder.timestamp).getTime();
      const saleToDelete = sales.find((sale: Sale) => {
        if (sale.orderId === targetOrder!.id) return true;
        const saleTime = new Date(sale.timestamp).getTime();
        return Math.abs(saleTime - orderTime) < 10000;
      });

      if (product) {
        let updatedBatches = [...(product.batches || [])];
        
        const quantityToRestore = isWholesale ? product.wholesaleUnitSize : 1;
        
        if (saleToDelete) {
           const batchIndex = updatedBatches.findIndex(b => b.id === saleToDelete.batchId);
           if (batchIndex >= 0) {
             updatedBatches[batchIndex].stock += saleToDelete.quantity;
           } else {
             if (updatedBatches.length > 0) {
               updatedBatches[0].stock += saleToDelete.quantity;
             } else {
               updatedBatches.push({
                 id: saleToDelete.batchId || Date.now().toString(),
                 batchNumber: 'RESTORED',
                 expiryDate: '',
                 buyingPricePerCarton: product.costPrice * product.wholesaleUnitSize,
                 stock: saleToDelete.quantity,
                 costPrice: saleToDelete.costPrice || product.costPrice,
                 dateAdded: new Date().toISOString()
               });
             }
           }
        } else {
           // Fallback if sale not found
           if (updatedBatches.length > 0) {
             updatedBatches[0].stock += quantityToRestore;
           } else {
             updatedBatches.push({
               id: Date.now().toString(),
               batchNumber: 'RESTORED',
               expiryDate: '',
               buyingPricePerCarton: product.costPrice * product.wholesaleUnitSize,
               stock: quantityToRestore,
               costPrice: product.costPrice,
               dateAdded: new Date().toISOString()
             });
           }
        }

        const updatedProduct = {
          ...product,
          stock: product.stock + (saleToDelete ? saleToDelete.quantity : quantityToRestore),
          batches: updatedBatches
        };

        await apiService.post('products', updatedProduct);

        // 2. Delete the sale record
        if (saleToDelete) {
          await apiService.delete('sales', saleToDelete.id);
        }

        // 3. Update or delete the order
        const updatedItems = [...targetOrder.items];
        updatedItems.splice(targetItemIndex, 1);

        if (updatedItems.length === 0) {
          await apiService.delete('orders', targetOrder.id);
          setOrders(prev => prev.filter(o => o.id !== targetOrder!.id));
        } else {
          const newSubtotal = targetOrder.subtotal - targetItem.price;
          const newTotalCost = targetOrder.totalCost - targetItem.price;
          const updatedOrder = await apiService.post('orders', {
            ...targetOrder,
            items: updatedItems,
            subtotal: newSubtotal,
            totalCost: newTotalCost
          });
          setOrders(prev => prev.map(o => o.id === targetOrder!.id ? updatedOrder : o));
        }

        // Update local state for products and sales
        setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
        if (saleToDelete) {
          setSales(prev => prev.filter(s => s.id !== saleToDelete.id));
        }
      }
    } catch (err) {
      console.error("Error deleting order item:", err);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0B172A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0077B6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <AuthScreen externalError={authError} setUser={setUser} onGuest={() => setIsGuest(true)} />;
  }

  return (
    <Router>
      <MapProvider apiKey={activeApiKey}>
        {(isLoaded) => (
          <div className="min-h-screen bg-system-bg flex flex-col font-sans selection:bg-primary selection:text-white">
            <AppRedirectHandler user={user} />
            <Header 
              user={user} 
              handleLogout={handleLogout} 
              setIsProfileOpen={setIsProfileOpen} 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery}
              cartCount={cart.length}
            />

            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomeTab user={user} setUser={setUser} products={products} sales={sales} expenses={expenses} orders={orders} setShowSettingsModal={setShowSettingsModal} addToCart={addToCart} />} />
                <Route path="/products" element={<ProductsTab products={products} isWholesale={isWholesale} setIsWholesale={setIsWholesale} addToCart={addToCart} userRole={user?.role || 'client'} isLoaded={isLoaded} searchQuery={searchQuery} setSearchQuery={setSearchQuery} cartCount={cart.length} />} />
                <Route path="/chat" element={<ChatTab />} />
                <Route path="/cart" element={<CartTab cart={cart} removeFromCart={removeFromCart} updateCartQuantity={updateCartQuantity} onCheckout={handleCheckout} isLoaded={isLoaded} userName={user?.role === 'manager' && selectedCustomer ? selectedCustomer.name : (user?.name || 'Guest')} selectedCustomer={user?.role === 'manager' ? selectedCustomer : null} />} />
                {user?.role === 'manager' && (
                  <>
                    <Route path="/manager" element={<ManagerDashboard user={user} setUser={setUser} products={products} setProducts={setProducts} sales={sales} expenses={expenses} setExpenses={setExpenses} orders={orders} vendors={vendors} setVendors={setVendors} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} showSettingsModal={showSettingsModal} setShowSettingsModal={setShowSettingsModal} />} />
                    <Route path="/orders" element={<ManagerOrdersTab orders={orders} onReceivePayment={handleReceivePayment} onDeleteOrderGroup={handleDeleteOrderGroup} onDeleteOrderItem={handleDeleteOrderItem} searchQuery={searchQuery} />} />
                  </>
                )}
              </Routes>
            </main>

            <nav className="sticky bottom-0 bg-white border-t border-gray-50 p-6 pb-8 flex justify-around items-center z-40">
              <NavLink to="/" icon={Home} />
              <NavLink to="/products" icon={Search} />
              <button 
                onClick={() => {
                  if (user) {
                    setIsProfileOpen(true);
                  } else {
                    setIsGuest(false);
                  }
                }}
                className={`flex flex-col items-center group transition-colors ${user ? 'text-gray-400' : 'text-[#ff6b00]'}`}
              >
                <div className="relative p-2 group-active:scale-90 transition-transform">
                  <User size={32} strokeWidth={1.5} />
                </div>
              </button>
              <NavLink to="/cart" icon={ShoppingBag} badge={cart.length} />
            </nav>

            {/* Settings Modal */}
            <AnimatePresence>
              {showSettingsModal && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col">
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="flex flex-col h-full w-full bg-white"
                  >
                    <div className="safe-top bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
                      <button onClick={() => setShowSettingsModal(false)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <ArrowLeft size={24} />
                      </button>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {isProfileIncomplete ? 'Complete Store Setup' : 'Company Settings'}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {isProfileIncomplete ? 'Required Information' : 'Business Identity'}
                        </p>
                      </div>
                      <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-900 p-2 transition-colors">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 pb-32">
                      <div className="max-w-2xl mx-auto space-y-8">
                        <div className="space-y-6 bg-gray-50 p-8 rounded-[32px] border border-gray-100 shadow-sm">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-gray-400 ml-1">Company Name</label>
                              <input 
                                className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 focus:ring-2 focus:ring-[#0077B6] outline-none font-bold"
                                value={settingsForm.businessName || ''}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, businessName: e.target.value }))}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-gray-400 ml-1">Address</label>
                              <input 
                                className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 focus:ring-2 focus:ring-[#0077B6] outline-none font-bold"
                                value={settingsForm.address || ''}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, address: e.target.value }))}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 ml-1">City/State</label>
                                <input 
                                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 focus:ring-2 focus:ring-[#0077B6] outline-none font-bold"
                                  value={settingsForm.cityState || ''}
                                  onChange={(e) => setSettingsForm(prev => ({ ...prev, cityState: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 ml-1">Postal Code</label>
                                <input 
                                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 focus:ring-2 focus:ring-[#0077B6] outline-none font-bold"
                                  value={settingsForm.postalCode || ''}
                                  onChange={(e) => setSettingsForm(prev => ({ ...prev, postalCode: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-gray-400 ml-1">TIN Number</label>
                              <input 
                                className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 focus:ring-2 focus:ring-[#0077B6] outline-none font-bold"
                                value={settingsForm.tinNumber || ''}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, tinNumber: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 bg-gray-50 p-8 rounded-[32px] border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                              <Calculator size={20} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Tax & Accounts</h4>
                          </div>

                          <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-900">Include Accounts Receivable</p>
                                <p className="text-[10px] text-gray-500">Include unpaid orders in gross revenue calculations</p>
                              </div>
                              <input 
                                type="checkbox"
                                className="w-6 h-6 rounded-lg bg-gray-100 border-gray-200 text-[#0077B6] focus:ring-[#0077B6]"
                                checked={settingsForm.includeReceivableInRevenue || false}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, includeReceivableInRevenue: e.target.checked }))}
                              />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-900">VAT Applicable</p>
                                <p className="text-[10px] text-gray-500">Include VAT in system accounts and reports</p>
                              </div>
                              <input 
                                type="checkbox"
                                className="w-6 h-6 rounded-lg bg-gray-100 border-gray-200 text-[#0077B6] focus:ring-[#0077B6]"
                                checked={settingsForm.isVatApplicable || false}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, isVatApplicable: e.target.checked }))}
                              />
                            </div>

                            {settingsForm.isVatApplicable && (
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 ml-1">VAT Rate (%)</label>
                                <input 
                                  type="number"
                                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 focus:ring-2 focus:ring-[#0077B6] outline-none font-bold"
                                  value={settingsForm.vatRate || 18}
                                  onChange={(e) => setSettingsForm(prev => ({ ...prev, vatRate: Number(e.target.value) }))}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-6 bg-gray-50 p-8 rounded-[32px] border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#0077B6]/10 rounded-xl flex items-center justify-center text-[#0077B6]">
                              <Shield size={20} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Device Permissions</h4>
                          </div>
                          <div className="space-y-4">
                            <p className="text-xs text-gray-500 leading-relaxed">
                              Grant access to your device features to enable barcode scanning and customer location tracking.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <button 
                                onClick={async () => {
                                  try {
                                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                    stream.getTracks().forEach(track => track.stop());
                                    alert("Camera permission granted successfully!");
                                  } catch (err) {
                                    alert("Could not access camera. Please check your browser settings.");
                                  }
                                }}
                                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-gray-200 text-gray-900 hover:border-[#0077B6] transition-all text-sm font-bold"
                              >
                                <Camera size={18} className="text-[#0077B6]" />
                                Enable Camera
                              </button>
                              <button 
                                onClick={() => {
                                  navigator.geolocation.getCurrentPosition(
                                    () => alert("Location permission granted successfully!"),
                                    () => alert("Could not access location. Please check your browser settings."),
                                    { enableHighAccuracy: true }
                                  );
                                }}
                                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-gray-200 text-gray-900 hover:border-[#0077B6] transition-all text-sm font-bold"
                              >
                                <MapPin size={18} className="text-[#0077B6]" />
                                Enable Location
                              </button>
                            </div>
                          </div>
                        </div>

                        {!isProfileIncomplete && (
                          <div className="space-y-6 bg-red-50 p-8 rounded-[32px] border border-red-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500">
                                <Trash2 size={20} />
                              </div>
                              <h4 className="text-lg font-bold text-red-900">Danger Zone</h4>
                            </div>
                            <div className="space-y-4">
                              <p className="text-xs text-red-600 leading-relaxed">
                                Permanently delete all products, sales, expenses, orders, and customers from your store. This action is irreversible.
                              </p>
                              <button 
                                onClick={handleClearAllData}
                                disabled={isClearingData}
                                className="w-full py-4 rounded-2xl bg-red-100 text-red-600 border border-red-200 font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                              >
                                {isClearingData ? (
                                  <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 size={18} />
                                    Clear All Store Data
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={handleSaveSettings}
                          disabled={!isFormValid || isSavingSettings}
                          className={`w-full py-5 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                            !isFormValid ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-[#ff6b00] text-white hover:opacity-90 active:scale-95 shadow-orange-500/20 shadow-xl'
                          }`}
                        >
                          {isSavingSettings ? 'Saving...' : (isFormValid ? 'Save Settings' : 'Complete Required Fields')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* API Key Configuration Modal */}
            <AnimatePresence>
              {isConfigOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-[#1E293B] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-700"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white">Map Configuration</h3>
                      <button onClick={() => setIsConfigOpen(false)} className="text-gray-400 hover:text-white">
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Google Maps API Key</label>
                        <div className="relative">
                          <input 
                            type="password"
                            placeholder="Paste your API key here..."
                            defaultValue={userApiKey}
                            id="apiKeyInput"
                            className="w-full bg-[#0B172A] border border-gray-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-[#0077B6] focus:outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500">
                          Your key is stored locally in your browser and is never sent to our servers.
                        </p>
                      </div>

                      <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                        <p className="text-xs text-blue-400 leading-relaxed">
                          Ensure your key has <strong>Maps JavaScript API</strong>, <strong>Places API</strong>, and <strong>Directions API</strong> enabled in the Google Cloud Console.
                        </p>
                      </div>

                      <button 
                        onClick={() => {
                          const input = document.getElementById('apiKeyInput') as HTMLInputElement;
                          saveApiKey(input.value);
                        }}
                        className="w-full bg-[#0077B6] text-white py-4 rounded-xl font-bold hover:bg-[#005f8a] transition-all"
                      >
                        Save & Load Map
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* User Profile Modal */}
            <AnimatePresence>
              {isProfileOpen && user && (
                <ProfileModal 
                  user={user} 
                  onClose={() => setIsProfileOpen(false)} 
                  onOpenMapConfig={() => {
                    setIsProfileOpen(false);
                    setIsConfigOpen(true);
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </MapProvider>
    </Router>
  );
}
