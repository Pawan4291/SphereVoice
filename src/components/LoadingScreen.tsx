import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated logo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="relative w-20 h-20 mx-auto mb-6"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 opacity-20 blur-xl" />
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
            <Globe className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        {/* Text */}
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-orange-400 text-sm font-mono"
        >
          Initializing SphereVoice…
        </motion.p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 bg-orange-500 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
