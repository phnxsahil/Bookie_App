"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/backend/database/browser";
import { useMemo } from "react";

export default function LandingPage() {
    const supabase = useMemo(() => createClient(), []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden bg-white selection:bg-black selection:text-white font-sans abstract-bg">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-2 group">
                    <img
                        src="/assets/logo.png"
                        alt="Bookie"
                        className="w-10 h-10 object-contain drop-shadow-md"
                    />
                    <span className="text-xl font-bold tracking-tight">Bookie</span>
                </div>
            </header>

            {/* Abstract decorative blobs — GPU-accelerated */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-[100px] opacity-50 gpu-accelerated animate-pulse-slow"
                />
                <div
                    className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-gradient-to-tl from-yellow-50 to-pink-50 rounded-full blur-[120px] opacity-50 gpu-accelerated animate-pulse-slow"
                    style={{ animationDelay: "2s" }}
                />
            </div>

            {/* Scattered logo watermarks */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
                {[
                    { top: "8%", left: "5%", rotate: -15, size: 40, opacity: 0.04 },
                    { top: "15%", right: "8%", rotate: 20, size: 55, opacity: 0.03 },
                    { top: "45%", left: "3%", rotate: -30, size: 35, opacity: 0.035 },
                    { top: "60%", right: "12%", rotate: 10, size: 60, opacity: 0.025 },
                    { top: "80%", left: "15%", rotate: 45, size: 45, opacity: 0.03 },
                    { top: "25%", left: "45%", rotate: -5, size: 30, opacity: 0.02 },
                    { top: "70%", right: "30%", rotate: 25, size: 50, opacity: 0.025 },
                    { top: "35%", right: "3%", rotate: -20, size: 38, opacity: 0.03 },
                ].map((pos, i) => (
                    <img
                        key={i}
                        src="/assets/logo.png"
                        alt=""
                        className="absolute select-none"
                        style={{
                            top: pos.top,
                            left: pos.left,
                            right: pos.right,
                            width: pos.size,
                            height: pos.size,
                            opacity: pos.opacity,
                            transform: `rotate(${pos.rotate}deg)`,
                            filter: "grayscale(100%)",
                        }}
                    />
                ))}
            </div>

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 sm:px-8 lg:px-12 pt-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center w-full max-w-5xl"
                >
                    {/* Logo Animation */}
                    <motion.div
                        className="mb-12 flex justify-center items-center"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <div className="relative">
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-2xl opacity-20 animate-pulse-slow"
                            />
                            <motion.img
                                src="/assets/logo.png"
                                alt="Bookie Large Logo"
                                className="w-24 h-24 sm:w-32 sm:h-32 object-contain relative z-10 drop-shadow-2xl gpu-accelerated"
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                whileHover={{ scale: 1.1, rotate: 10 }}
                            />
                        </div>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                        className="mb-8 leading-none"
                    >
                        <span className="text-5xl sm:text-7xl md:text-8xl font-bold text-gray-900 tracking-tighter block mb-2">
                            Here&apos;s your <span className="font-serif italic bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-black inline-block transform hover:skew-x-6 transition-transform">Bookie</span>
                        </span>
                    </motion.h1>

                    {/* Subtext */}
                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="text-lg sm:text-xl text-gray-500 mb-16 max-w-2xl mx-auto leading-relaxed font-medium"
                    >
                        The intelligent bookmark manager that bakes your links into organized,
                        AI-enriched insights. Minimalist design, powerful organization.
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <motion.button
                            onClick={handleLogin}
                            className="group relative w-full sm:w-auto min-w-[300px] h-16 bg-black text-white rounded-full text-lg font-bold overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1"
                            whileHover="hover"
                            initial="initial"
                        >
                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                {/* Default State */}
                                <motion.div
                                    className="absolute inset-0 flex items-center justify-center gap-2"
                                    variants={{
                                        initial: { y: 0 },
                                        hover: { y: -64 },
                                    }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                >
                                    <span>Bake your first <span className="font-serif italic font-normal text-xl">Bookie</span></span>
                                    <ArrowRight className="w-5 h-5" />
                                </motion.div>

                                {/* Hover State (Google Sign In) */}
                                <motion.div
                                    className="absolute inset-0 flex items-center justify-center gap-3 bg-white text-black border-2 border-black rounded-full"
                                    variants={{
                                        initial: { y: 64 },
                                        hover: { y: 0 },
                                    }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                >
                                    {/* Google Logo SVG */}
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span>Continue with Google</span>
                                </motion.div>
                            </div>
                        </motion.button>
                    </motion.div>

                </motion.div>
            </div>
        </div>
    );
}
