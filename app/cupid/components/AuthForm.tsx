"use client";
import { motion } from "framer-motion";
import { FaUser, FaLock, FaEnvelope, FaSpinner, FaArrowRight, FaIdCard } from "react-icons/fa";

// --- THEME-AWARE STYLES ---
// Light Mode (Default) -> Black UI
// Dark Mode ('dark') -> White UI
const INPUT_CONTAINER = "relative group";
const INPUT_ICON = "absolute top-4 left-4 transition-colors duration-300 text-white/50 group-focus-within:text-rose-500 dark:text-black/50 dark:group-focus-within:text-rose-600";
const INPUT_FIELD = "w-full rounded-xl p-4 pl-12 outline-none transition-all duration-300 text-sm font-bold bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:bg-zinc-100 dark:border-zinc-300 dark:text-black dark:placeholder:text-zinc-400 dark:focus:border-rose-600 dark:focus:ring-rose-600";

interface AuthFormProps {
  mode: 'LOGIN' | 'SIGNUP';
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword?: string; setConfirmPassword?: (v: string) => void;
  isLoading: boolean;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  authError: string;
  onSubmit: () => void;
  onSwitchMode: () => void;
  agreedToTerms?: boolean; setAgreedToTerms?: (v: boolean) => void;
  onShowTerms?: () => void;
  onForgotPassword?: () => void; 
}

export const AuthForm = (props: AuthFormProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="w-full max-w-md mx-auto"
    >
      {/* CARD CONTAINER */}
      <div className="p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden transition-colors duration-300 bg-black border border-white/10 dark:bg-white dark:border-black/10 dark:shadow-[0_0_50px_rgba(0,0,0,0.1)]">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black tracking-tighter uppercase mb-2 transition-colors duration-300 text-white dark:text-black">
            {props.mode === 'LOGIN' ? 'Welcome Back' : 'Join the Club'}
          </h2>
          <p className="text-xs font-mono uppercase tracking-widest transition-colors duration-300 text-zinc-500 dark:text-zinc-400">
            {props.mode === 'LOGIN' ? 'Enter your credentials' : 'Create your account'}
          </p>
        </div>

        {/* INPUTS */}
        <div className="space-y-4">
          <div className={INPUT_CONTAINER}>
            <FaEnvelope className={INPUT_ICON} />
            <input 
                type="email" 
                placeholder="DLSAU Email" 
                className={INPUT_FIELD}
                value={props.email}
                onChange={(e) => props.setEmail(e.target.value)}
            />
          </div>

          <div className={INPUT_CONTAINER}>
            <FaLock className={INPUT_ICON} />
            <input 
                type={props.showPassword ? "text" : "password"} 
                placeholder="Password" 
                className={INPUT_FIELD}
                value={props.password}
                onChange={(e) => props.setPassword(e.target.value)}
            />
          </div>

          {props.mode === 'SIGNUP' && props.setConfirmPassword && (
            <div className={INPUT_CONTAINER}>
              <FaLock className={INPUT_ICON} />
              <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  className={INPUT_FIELD}
                  value={props.confirmPassword}
                  onChange={(e) => props.setConfirmPassword!(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* FORGOT PASS LINK */}
        {props.mode === 'LOGIN' && (
            <div className="mt-3 text-right">
                <button 
                    onClick={props.onForgotPassword}
                    className="text-[10px] font-bold uppercase tracking-wide transition-colors duration-300 text-zinc-400 hover:text-white dark:text-zinc-500 dark:hover:text-black"
                >
                    Forgot Password?
                </button>
            </div>
        )}

        {/* TERMS CHECKBOX */}
        {props.mode === 'SIGNUP' && (
            <div className="flex items-center gap-3 mt-6">
                <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded cursor-pointer border-zinc-700 bg-zinc-900 checked:bg-rose-500 dark:border-zinc-300 dark:bg-zinc-100 dark:checked:bg-rose-600 transition-colors"
                    checked={props.agreedToTerms}
                    onChange={(e) => props.setAgreedToTerms!(e.target.checked)}
                />
                <span className="text-xs transition-colors duration-300 text-zinc-400 dark:text-zinc-600">
                    I agree to the <button onClick={props.onShowTerms} className="font-bold underline decoration-zinc-600 hover:decoration-white hover:text-white dark:decoration-zinc-400 dark:hover:decoration-black dark:hover:text-black transition-all">Terms & Rules</button>
                </span>
            </div>
        )}

        {/* ERROR MESSAGE */}
        {props.authError && (
            <div className="mt-6 p-3 rounded-xl flex items-center gap-3 text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 dark:bg-red-50 dark:border-red-200 dark:text-red-600 transition-colors">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
                {props.authError}
            </div>
        )}

        {/* SUBMIT BUTTON - FIXED CONTRAST */}
        {/* We use !text-black and !text-white to override any global defaults */}
        <button 
            onClick={props.onSubmit} 
            disabled={props.isLoading}
            className={`
                mt-8 w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 shadow-lg border-0
                bg-white !text-black hover:bg-zinc-200 
                dark:bg-black dark:!text-white dark:hover:bg-zinc-800
            `}
        >
            {props.isLoading ? <FaSpinner className="animate-spin mx-auto" /> : (props.mode === 'LOGIN' ? 'LOG IN' : 'CREATE ACCOUNT')}
        </button>

        {/* SWITCH MODE */}
        <div className="mt-6 text-center">
            <p className="text-xs mb-2 transition-colors duration-300 text-zinc-500 dark:text-zinc-400">
                {props.mode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button 
                onClick={props.onSwitchMode}
                className="text-xs font-black border-b pb-0.5 transition-all uppercase tracking-widest text-white border-white/30 hover:border-rose-500 hover:text-rose-500 dark:text-black dark:border-black/30 dark:hover:border-rose-600 dark:hover:text-rose-600"
            >
                {props.mode === 'LOGIN' ? 'Sign Up Here' : 'Log In Here'}
            </button>
        </div>

      </div>
    </motion.div>
  );
};