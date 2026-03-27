"use client";

import { configureStore } from "@reduxjs/toolkit";
import { paymentSlice } from "./slices/payment-slice";

export const store = configureStore({
  reducer: {
    payment: paymentSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
