"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const carouselImages = [
  "/about/CS2.jpg", 
  "/about/CS1.jpg", 
  "/about/CS3.jpg", 
"/about/CS4.jpg",
];

export default function AboutPage() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
  }, []);

  return (
    <section className="min-h-screen bg-black text-white relative overflow-hidden pb-20">
      
      {/* FIX 1: Updated gradient syntax for Tailwind v4 */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-linear-to-b from-green-900/20 to-transparent pointer-events-none" />

      <div className="container mx-auto px-6 pt-32 relative z-10">

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            About <span className="text-green-500">JPCS</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Innovating the Future, One Line of Code at a Time.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center gap-12 mb-32">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full md:w-1/2 space-y-6"
          >
            <h2 className="text-3xl font-bold text-white border-l-4 border-green-500 pl-4">
              Who We Are
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              The <span className="text-green-400 font-semibold">Junior Philippine Computer Society (JPCS)</span> at De La Salle Araneta University is a premier student organization dedicated to fostering technological excellence.
            </p>
            <p className="text-gray-300 leading-relaxed text-lg">
              We are a community of aspiring developers, designers, and tech enthusiasts. Our goal is to bridge the gap between academic theory and real-world application through workshops, hackathons, and collaborative projects.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            // FIX 2: Removed duplicate 'w-full'
            className="w-full md:w-1/2 relative h-[400px] rounded-2xl overflow-hidden border border-green-500/30 group"
          >
            <div className="absolute inset-0 bg-green-500/10 group-hover:bg-transparent transition-colors z-10" />
            <Image
              src="/about/WWD.jpg" 
              alt="JPCS Team"
              fill
              className="object-cover"
            />
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-32">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-8 rounded-2xl bg-zinc-900/50 border border-green-500/20 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
            <h3 className="text-2xl font-bold text-green-400 mb-4">Our Mission</h3>
            <p className="text-gray-300 italic">
              "To empower students with cutting-edge technical skills and ethical values, preparing them to become leaders in the IT industry."
            </p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-8 rounded-2xl bg-zinc-900/50 border border-green-500/20 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
            <h3 className="text-2xl font-bold text-green-400 mb-4">Our Vision</h3>
            <p className="text-gray-300 italic">
              "A dynamic community of tech innovators driving positive change through technology and excellence."
            </p>
          </motion.div>
        </div>

        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">What We Do</h2>
            <p className="text-gray-400">Swipe to explore our events and workshops</p>
          </div>

          <motion.div 
            ref={carouselRef} 
            className="cursor-grab overflow-hidden" 
            whileTap={{ cursor: "grabbing" }}
          >
            <motion.div 
              drag="x" 
              dragConstraints={{ right: 0, left: -width }} 
              className="flex gap-6"
            >
              {carouselImages.map((src, index) => (
                <motion.div 
                  key={index} 
                  className="min-w-[300px] h-[400px] md:min-w-[400px] relative rounded-xl overflow-hidden border border-zinc-800"
                >
                  <Image 
                    src={src} 
                    alt="Activity" 
                    fill 
                    className="object-cover pointer-events-none" 
                  />
                  {/* FIX 3: Updated gradient syntax for Tailwind v4 */}
                  <div className="absolute bottom-0 w-full h-1/2 bg-linear-to-t from-black to-transparent opacity-80" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}