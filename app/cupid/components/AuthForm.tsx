"use client";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt, FaUserPlus, FaSpinner } from "react-icons/fa";
import { INPUT_FIELD_STYLE, PRIMARY_BTN_STYLE } from "../constants";

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
}

export const AuthForm = (props: AuthFormProps) => {
  const isLogin = props.mode === 'LOGIN';

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-md mx-auto w-full relative z-10">
      <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 text-2xl">
           {isLogin ? <FaSignInAlt /> : <FaUserPlus />}
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{isLogin ? "LASALLIAN LOGIN" : "CREATE ACCOUNT"}</h2>
        {props.authError && <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-xs p-3 rounded mb-4">{props.authError}</div>}
        
        <div className="space-y-4">
          <div className="relative">
             <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
             <input type="email" className={INPUT_FIELD_STYLE + " pl-12"} placeholder="name@dlsau.edu.ph" value={props.email} onChange={(e) => props.setEmail(e.target.value)} />
          </div>
          <div className="relative">
             <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
             <input type={props.showPassword ? "text" : "password"} className={INPUT_FIELD_STYLE + " pl-12 pr-12"} placeholder="Password" value={props.password} onChange={(e) => props.setPassword(e.target.value)} />
             <button onClick={() => props.setShowPassword(!props.showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-rose-500">{props.showPassword ? <FaEyeSlash /> : <FaEye />}</button>
          </div>
          
          {!isLogin && (
             <>
                <input type="password" className={INPUT_FIELD_STYLE} placeholder="Confirm Password" value={props.confirmPassword} onChange={(e) => props.setConfirmPassword?.(e.target.value)} />
                
                <div className="flex items-center gap-2 text-xs text-zinc-400 justify-center">
                    <input type="checkbox" checked={props.agreedToTerms} onChange={e => props.setAgreedToTerms?.(e.target.checked)} className="accent-rose-500" /> 
                    I agree to <button onClick={props.onShowTerms} className="text-rose-500 hover:underline">Terms</button>
                </div>
             </>
          )}

          <button onClick={props.onSubmit} disabled={props.isLoading} className={PRIMARY_BTN_STYLE}>
             {props.isLoading ? <FaSpinner className="animate-spin" /> : (isLogin ? "AUTHENTICATE" : "PROCEED")}
          </button>
        </div>
        <button onClick={props.onSwitchMode} className="mt-6 text-xs text-zinc-500 hover:text-rose-500 underline">
            {isLogin ? "No account? Create one." : "Login instead."}
        </button>
      </div>
    </motion.div>
  );
};