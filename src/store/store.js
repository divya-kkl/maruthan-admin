import { configureStore } from '@reduxjs/toolkit';
import productReducer from './productSlice';
import categoryReducer from './categorySlice';
import orderReducer from './orderSlice';
import userReducer from './userSlice';
import shopUserReducer from './shopUserSlice';
import topBannerReducer from './topBannerSlice';
import couponReducer from './couponSlice';
import cartReducer from './cartSlice';
import bannerReducer from './bannerSlice';
import deliveryReducer from './deliverySlice';
import paymentReducer from './paymentSlice';
import faqReducer from './faqSlice';
import tagReducer from './tagSlice';

export const store = configureStore({
  reducer: {
    product: productReducer,
    category: categoryReducer,
    order: orderReducer,
    user: userReducer,
    shopUser: shopUserReducer,
    topBanner: topBannerReducer,
    coupon: couponReducer,
    cart: cartReducer,
    banner: bannerReducer,
    delivery: deliveryReducer,
    payment: paymentReducer,
    faq: faqReducer,
    tag: tagReducer
  }
});
