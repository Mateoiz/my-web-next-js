"use client";
import { ChangeEvent, useState } from "react";
import { motion } from "framer-motion";
import { FaFingerprint, FaCamera, FaTrash, FaBirthdayCake, FaRuler, FaVenusMars, FaSpinner, FaArrowRight, FaInstagram, FaFacebook, FaIdCard, FaGamepad, FaQuoteLeft, FaArrowLeft, FaSave, FaUserEdit, FaFilter } from "react-icons/fa";
import { INPUT_FIELD_STYLE, LABEL_STYLE, PRIMARY_BTN_STYLE, INTEREST_TAGS } from "../constants";

interface ProfileFormProps {
  email: string;
  formData: any; setFormData: (v: any) => void;
  imageFiles: (File|null)[];
  previewUrls: (string|null)[];
  onImageSelect: (i: number, e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (i: number) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isUploading: boolean;
  fileInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}

export const ProfileForm = (props: ProfileFormProps) => {
  const [idError, setIdError] = useState("");
  const isEditing = !!props.onCancel;

  const handleValidationAndSubmit = () => {
    // 1. Validate ID Year (2019 - 2026)
    const id = props.formData.studentId.trim();
    const yearPrefix = parseInt(id.substring(0, 4));

    if (isNaN(yearPrefix) || yearPrefix < 2019 || yearPrefix > 2026) {
        setIdError("ID must start with a valid year (2019-2026). Example: 2024-01-...");
        return;
    }

    if (!id.includes("-") || id.length < 8 || id.length > 12) {
        setIdError("Invalid format. ID must be 8-12 characters long.");
        return;
    }

    // 2. Validate Age Range
    if (parseInt(props.formData.minAge) > parseInt(props.formData.maxAge)) {
        alert("Minimum age cannot be higher than maximum age!");
        return;
    }

    setIdError(""); 
    props.onSubmit(); 
  };

  return (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-4xl mx-auto w-full relative z-50">
      <div className="bg-zinc-900/80 border border-zinc-800 p-8 md:p-10 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
           <div className="flex items-center gap-4">
               {isEditing && (
                   <button onClick={props.onCancel} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">
                       <FaArrowLeft />
                   </button>
               )}
               <div>
                   <h2 className="text-3xl font-black text-white flex items-center gap-3">
                     {isEditing ? <><FaUserEdit className="text-rose-500" /> EDIT PROFILE</> : <><FaFingerprint className="text-rose-500" /> CREATE YOUR VIBE</>}
                   </h2>
                   {isEditing && <p className="text-xs text-zinc-500 mt-1">Update your info to get better matches</p>}
               </div>
           </div>
           {!isEditing && (
               <span className="hidden md:block text-xs font-mono text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">
                 {props.email}
               </span>
           )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
           {/* IMAGE GRID */}
           <div className="lg:col-span-5 flex flex-col gap-4">
              <label className={LABEL_STYLE + " text-center"}>
                  {isEditing ? "Update Photos" : "Upload Your Best Shots 📸"}
              </label>
              <div className="grid grid-cols-2 grid-rows-2 gap-3 h-80 w-full">
                 <div onClick={() => props.fileInputRefs.current[0]?.click()} className="col-span-2 row-span-2 relative bg-zinc-800/30 border-2 border-dashed border-zinc-700/50 hover:border-rose-500/50 transition-all cursor-pointer overflow-hidden group rounded-2xl">
                    {props.previewUrls[0] ? ( 
                        <> 
                            <img src={props.previewUrls[0]!} className="w-full h-full object-cover" /> 
                            <button onClick={(e) => { e.stopPropagation(); props.onRemoveImage(0); }} className="absolute top-3 right-3 bg-black/60 p-2 rounded-full text-white hover:bg-rose-600/80"><FaTrash size={12}/></button> 
                        </> 
                    ) : ( 
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 group-hover:text-rose-400">
                            <FaCamera size={32} />
                            <span className="text-xs font-bold mt-3 tracking-widest">MAIN PIC</span>
                        </div> 
                    )}
                    <input type="file" ref={el => { props.fileInputRefs.current[0] = el }} className="hidden" accept="image/*" onChange={(e) => props.onImageSelect(0, e)} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3 h-32">
                 {[1, 2].map((idx) => (
                    <div key={idx} onClick={() => props.fileInputRefs.current[idx]?.click()} className="relative bg-zinc-800/30 rounded-xl border-2 border-dashed border-zinc-700/50 hover:border-rose-500/50 transition-all cursor-pointer overflow-hidden group">
                       {props.previewUrls[idx] ? ( 
                            <> 
                                <img src={props.previewUrls[idx]!} className="w-full h-full object-cover" /> 
                                <button onClick={(e) => { e.stopPropagation(); props.onRemoveImage(idx); }} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-rose-600/80"><FaTrash size={10}/></button> 
                            </> 
                        ) : ( 
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 group-hover:text-rose-400"><FaCamera size={16} /></div> 
                        )}
                       <input type="file" ref={el => { props.fileInputRefs.current[idx] = el }} className="hidden" accept="image/*" onChange={(e) => props.onImageSelect(idx, e)} />
                    </div>
                 ))}
              </div>
           </div>

           {/* DETAILS FORM */}
           <div className="lg:col-span-7 space-y-5">
              {/* ID & NICKNAME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={LABEL_STYLE}>Nickname / Alias</label>
                    <input type="text" className={INPUT_FIELD_STYLE} placeholder="What should we call you?" value={props.formData.name} onChange={e => props.setFormData({...props.formData, name: e.target.value})} />
                </div>
                <div>
                    <label className={LABEL_STYLE}>ID Number (2019-2026)</label>
                    <div className="relative">
                        <FaIdCard className="absolute top-4 right-4 text-zinc-600" />
                        <input 
                            type="text" 
                            className={`${INPUT_FIELD_STYLE} ${idError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`} 
                            placeholder="202X-XX-XXXX" 
                            maxLength={12} 
                            value={props.formData.studentId} 
                            onChange={e => {
                                props.setFormData({...props.formData, studentId: e.target.value});
                                if (idError) setIdError(""); 
                            }} 
                        />
                    </div>
                    {idError && <p className="text-red-400 text-[10px] mt-1 font-bold">{idError}</p>}
                </div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-3 gap-3">
                 <div>
                    <label className={LABEL_STYLE}><FaBirthdayCake className="inline mr-1 text-rose-500"/> Age</label>
                    <input type="number" className={INPUT_FIELD_STYLE} value={props.formData.age} onChange={e => props.setFormData({...props.formData, age: e.target.value})} />
                 </div>
                 <div>
                    <label className={LABEL_STYLE}><FaRuler className="inline mr-1 text-rose-500"/> Height</label>
                    <input type="text" className={INPUT_FIELD_STYLE} placeholder="5'8" value={props.formData.height} onChange={e => props.setFormData({...props.formData, height: e.target.value})} />
                 </div>
                 <div>
                    <label className={LABEL_STYLE}><FaVenusMars className="inline mr-1 text-rose-500"/> Gender</label>
                    <select className={INPUT_FIELD_STYLE} value={props.formData.gender} onChange={e => props.setFormData({...props.formData, gender: e.target.value})}> 
                        <option value="" className="bg-zinc-900">Select</option>
                        <option value="Male" className="bg-zinc-900">Male</option>
                        <option value="Female" className="bg-zinc-900">Female</option>
                        <option value="LGBTQ+" className="bg-zinc-900">LGBTQ+</option> 
                    </select>
                 </div>
              </div>

              {/* PREFERENCES SECTION */}
              <div className="p-5 bg-rose-500/5 rounded-2xl border border-rose-500/20 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                      <FaFilter className="text-rose-500" />
                      <span className="text-xs font-black text-rose-400 uppercase tracking-widest">Match Preferences</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      {/* Gender Pref */}
                      <div>
                          <label className={LABEL_STYLE}>I'm Looking For</label>
                          <select className={INPUT_FIELD_STYLE + " bg-zinc-800 border-zinc-700"} value={props.formData.preferredGender} onChange={e => props.setFormData({...props.formData, preferredGender: e.target.value})}> 
                            <option value="" className="bg-zinc-900">Select</option>
                            <option value="Female" className="bg-zinc-900">Females</option>
                            <option value="Male" className="bg-zinc-900">Males</option>
                            <option value="Any" className="bg-zinc-900">Everyone</option> 
                          </select>
                      </div>

                      {/* Age Range */}
                      <div>
                          <label className={LABEL_STYLE}>Age Range</label>
                          <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                className={INPUT_FIELD_STYLE + " text-center px-1"} 
                                placeholder="18" 
                                value={props.formData.minAge} 
                                onChange={e => props.setFormData({...props.formData, minAge: e.target.value})}
                              />
                              <span className="text-zinc-500 font-bold">-</span>
                              <input 
                                type="number" 
                                className={INPUT_FIELD_STYLE + " text-center px-1"} 
                                placeholder="25" 
                                value={props.formData.maxAge} 
                                onChange={e => props.setFormData({...props.formData, maxAge: e.target.value})}
                              />
                          </div>
                      </div>
                  </div>
              </div>

              {/* COURSE */}
              <div>
                  <label className={LABEL_STYLE}>What's your Major?</label>
                  <input type="text" className={INPUT_FIELD_STYLE} placeholder="e.g. BSCS, Psychology..." value={props.formData.course} onChange={e => props.setFormData({...props.formData, course: e.target.value})} />
              </div>

              {/* SOCIALS */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={LABEL_STYLE}><FaInstagram className="inline mr-1 text-pink-500"/> Instagram</label>
                    <input type="text" className={INPUT_FIELD_STYLE} value={props.formData.instagram} onChange={e => props.setFormData({...props.formData, instagram: e.target.value})} placeholder="@username" />
                 </div>
                 <div>
                    <label className={LABEL_STYLE}><FaFacebook className="inline mr-1 text-blue-500"/> Facebook</label>
                    <input type="text" className={INPUT_FIELD_STYLE} value={props.formData.facebook} onChange={e => props.setFormData({...props.formData, facebook: e.target.value})} placeholder="Profile Link" />
                 </div>
              </div>

              {/* BIO */}
              <div>
                  <label className={LABEL_STYLE}><FaQuoteLeft className="inline mr-1 text-zinc-600"/> Your Vibe (Bio)</label>
                  <textarea className={INPUT_FIELD_STYLE + " h-20 resize-none pt-3"} maxLength={150} placeholder="Tell us something interesting..." value={props.formData.bio} onChange={e => props.setFormData({...props.formData, bio: e.target.value})} />
              </div>

              {/* TAGS */}
              <div>
                  <label className={LABEL_STYLE}><FaGamepad className="inline mr-1 text-emerald-500"/> Interests (Max 5)</label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_TAGS.map(tag => { 
                        const isSelected = props.formData.tags.includes(tag); 
                        return (
                            <button key={tag} onClick={() => { 
                                if (isSelected) { 
                                    props.setFormData({...props.formData, tags: props.formData.tags.filter((t:string) => t !== tag)}); 
                                } else if (props.formData.tags.length < 5) { 
                                    props.setFormData({...props.formData, tags: [...props.formData.tags, tag]}); 
                                } 
                            }} 
                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all transform active:scale-95 ${isSelected ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:bg-zinc-800'}`}>
                                {tag}
                            </button>
                        ); 
                    })}
                  </div>
              </div>
           </div>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-800 flex justify-end gap-3">
           {isEditing && (
               <button onClick={props.onCancel} className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                   CANCEL
               </button>
           )}
           <button 
                onClick={handleValidationAndSubmit} 
                disabled={props.isUploading} 
                className={PRIMARY_BTN_STYLE + " w-full md:w-auto px-10 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500"}
            >
                {props.isUploading ? (
                    <><FaSpinner className="animate-spin" /> SAVING...</>
                ) : (
                    isEditing ? <><FaSave /> SAVE CHANGES</> : <><FaArrowRight /> READY TO MATCH</>
                )}
           </button>
        </div>
      </div>
    </motion.div>
  );
};