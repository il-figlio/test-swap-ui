"use client";
import React from "react";
import { Header } from "../components/layout/Header";
import { SwapForm } from "../components/swap/SwapForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Cross-Chain Swap
            </h1>
            <p className="text-muted-foreground">
              Seamlessly swap tokens between Pecorino Host and Signet chains
            </p>
          </div>
          <SwapForm />
        </div>
      </main>
    </div>
  );
}
