import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Color Palette from Ancient Gild
const COLORS = {
    blackCherry: '#550003',
    oldGold: '#B8AB38',
    vanillaCustard: '#E0D794',
    text: '#3D3D3D',
    //     surface: '#FFFFFF',

};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const STANDARD_TIMES = ['10:00 AM', '1:30 PM', '4:00 PM']; // Reduced to 3 options
const DURATIONS = ['20-30 mins', '1 hour', '60 mins - 2 hours', '2 hours+'];

export default function AdeolaScheduler() {
    const [step, setStep] = useState(0); // Starts at 0 for the First Meeting check
    const [isFirstMeeting, setIsFirstMeeting] = useState<boolean | null>(null);
    const [showTzModal, setShowTzModal] = useState(false);
    const [showCustomTime, setShowCustomTime] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // ⚙️ CONFIG: Replace with your deployed Google Apps Script Web App URL
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyXtdswl11LdLhLt72fpZtGJs-Z_dAJuCYMxBv5tyJJFrlOLA4EC_hcmDdlj_xyh4cv/exec';

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError('');
        const payload = {
            ...formData,
            isFirstMeeting,
            submittedAt: new Date().toISOString()
        };
        try {
            await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            nextStep();
        } catch {
            setSubmitError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const [formData, setFormData] = useState({
        name: '',
        reason: '',
        note: '',
        day: '',
        duration: '',
        time: '',
        timeRangeEnd: '' // For the optional time range
    });

    const pageTransition = {
        initial: { opacity: 0, y: 50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -50 },
        transition: { type: 'spring' as const, damping: 25, stiffness: 200 }
    };

    const nextStep = () => setStep(s => s + 1);

    return (
        <div style={{
            backgroundColor: COLORS.vanillaCustard,
            color: COLORS.text,
            fontFamily: "'Comfortaa', sans-serif"
        }} className="min-h-screen relative overflow-hidden transition-colors duration-500 z-0">

            {/* 8. SUBTLE LAVA LAMP BACKGROUND */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none opacity-40 mix-blend-multiply">
                <motion.div
                    animate={{ x: [0, 150, -100, 0], y: [0, -150, 100, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px]"
                    style={{ backgroundColor: COLORS.oldGold }}
                />
                <motion.div
                    animate={{ x: [0, -150, 100, 0], y: [0, 150, -100, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[140px]"
                    style={{ backgroundColor: COLORS.blackCherry, opacity: 0.5 }}
                />
            </div>

            <div className="max-w-xl mx-auto px-8 py-20 flex flex-col justify-center min-h-screen relative z-10">
                <AnimatePresence mode="wait">

                    {/* STEP 0: INITIAL GREETING & FIRST MEETING CHECK (Changes 4 & 5) */}
                    {step === 0 && (
                        <motion.div key="step0" {...pageTransition} className="text-center space-y-10">
                            <h1 className="text-4xl font-bold tracking-tight leading-snug">
                                Looking forward to speaking with you.
                            </h1>
                            <div className="space-y-6">
                                <p className="text-lg text-stone-600 font-medium">Is this our first meeting?</p>
                                <div className="flex justify-center gap-6">
                                    <button
                                        onClick={() => { setIsFirstMeeting(true); nextStep(); }}
                                        className="px-10 py-4 bg-white/80 backdrop-blur-md rounded-full font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => { setIsFirstMeeting(false); nextStep(); }}
                                        className="px-10 py-4 bg-white/80 backdrop-blur-md rounded-full font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 1: NAME INPUT (Change 1 & 5) */}
                    {step === 1 && (
                        <motion.div key="step1" {...pageTransition} className="text-center space-y-8">
                            <h1 className="text-4xl font-light tracking-tight leading-snug">
                                {isFirstMeeting ? "Nice to meet you," : "Looking forward to speaking again,"}
                                <br />
                                <span className="relative inline-block mt-6">
                                    <input
                                        autoFocus
                                        maxLength={40} // 40 chars limit, no counter shown
                                        className="bg-transparent border-b-[3px] border-stone-800/20 focus:border-stone-800 outline-none w-64 pb-2 text-4xl font-bold transition-all text-center"
                                        placeholder=" "
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && formData.name && nextStep()}
                                    />
                                    {/* Blinking cursor effect handled by native browser, kept line short */}
                                </span>
                            </h1>
                            {formData.name && (
                                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={nextStep} className="mt-8 px-6 py-2 bg-stone-800 text-white rounded-full font-bold transition-all hover:scale-105">
                                    Continue
                                </motion.button>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 2: REASON */}
                    {step === 2 && (
                        <motion.div key="step2" {...pageTransition} className="space-y-10 text-center">
                            <h2 className="text-3xl font-bold">What is the focus of our sync?</h2>
                            <div className="flex justify-center gap-4">
                                {['Inquiry', 'Joint Venture'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => { setFormData({ ...formData, reason: type }); nextStep(); }}
                                        className="relative overflow-hidden px-8 py-4 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all text-lg font-bold active:scale-95 group border border-white"
                                    >
                                        {type}
                                        <motion.span whileTap={{ scale: 4, opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 bg-stone-200 rounded-full pointer-events-none opacity-0 group-active:opacity-100" />
                                    </button>
                                ))}
                            </div>
                            <div className="max-w-md mx-auto space-y-4 pt-4">
                                <p className="text-sm uppercase tracking-widest text-stone-600 font-bold">Or a few words...</p>
                                <input
                                    className="w-full bg-transparent border-b-2 border-stone-800/20 py-3 outline-none focus:border-stone-800 transition-all text-xl text-center"
                                    placeholder="Context (optional)"
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && nextStep()}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: DATE, DURATION & TIME (Change 3) */}
                    {step === 3 && (
                        <motion.div key="step3" {...pageTransition} className="space-y-12">

                            {/* Day Selection */}
                            <section>
                                <h3 className="text-stone-600 uppercase text-xs tracking-widest font-bold mb-4 text-center">Select a Day</h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {DAYS.map(day => (
                                        <button
                                            key={day}
                                            onClick={() => setFormData({ ...formData, day })}
                                            className={`px-5 py-3 rounded-2xl border-2 transition-all font-bold ${formData.day === day ? 'bg-stone-800 text-white border-stone-800' : 'bg-white/60 border-transparent hover:bg-white shadow-sm'}`}
                                        >
                                            {day.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Duration Selection */}
                            {formData.day && (
                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
                                    <h3 className="text-stone-600 uppercase text-xs tracking-widest font-bold mb-4">Expected Duration</h3>
                                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                                        {DURATIONS.map(dur => (
                                            <button
                                                key={dur}
                                                onClick={() => setFormData({ ...formData, duration: dur })}
                                                className={`py-3 rounded-xl border-2 transition-all font-bold text-sm ${formData.duration === dur ? 'bg-stone-800 text-white border-stone-800' : 'bg-white/60 border-transparent hover:bg-white shadow-sm'}`}
                                            >
                                                {dur}
                                            </button>
                                        ))}
                                    </div>
                                </motion.section>
                            )}

                            {/* Time Selection */}
                            {formData.duration && (
                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                    <h3 className="text-stone-600 uppercase text-xs tracking-widest font-bold mb-4 text-center">Available Times (EST)</h3>

                                    {/* 3 Standard Options */}
                                    {!showCustomTime && STANDARD_TIMES.map((time) => (
                                        <button
                                            key={time}
                                            onClick={() => { setFormData({ ...formData, time }); nextStep(); }}
                                            className="w-full p-6 text-left bg-white/80 backdrop-blur-sm shadow-sm border border-white rounded-3xl text-xl font-bold hover:shadow-md transition-all flex justify-between items-center group"
                                        >
                                            {time}
                                            <span className="text-sm font-normal text-stone-400 group-hover:text-stone-800 transition-colors">Select →</span>
                                        </button>
                                    ))}

                                    {/* 4th Option: Request Time */}
                                    {!showCustomTime ? (
                                        <button
                                            onClick={() => setShowCustomTime(true)}
                                            className="w-full p-6 bg-transparent border-2 border-stone-800/20 border-dashed rounded-3xl text-lg font-bold text-stone-700 hover:border-stone-800 hover:text-stone-900 transition-all flex justify-center items-center"
                                        >
                                            Request a specific time
                                        </button>
                                    ) : (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-white/90 backdrop-blur-md rounded-3xl shadow-lg space-y-6">
                                            <h4 className="font-bold text-center">Propose a Time</h4>
                                            <div className="flex items-center gap-4 justify-center">
                                                <input type="time" onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="p-3 bg-stone-100 rounded-xl outline-none font-bold text-lg" />
                                                <span className="text-stone-400 font-bold">to</span>
                                                <input type="time" onChange={(e) => setFormData({ ...formData, timeRangeEnd: e.target.value })} className="p-3 bg-stone-100 rounded-xl outline-none font-bold text-lg" />
                                            </div>
                                            <p className="text-xs text-center text-stone-500 font-medium">Second time is optional if you want to provide an availability window.</p>
                                            <button
                                                onClick={() => formData.time && nextStep()}
                                                className={`w-full py-4 rounded-xl font-bold text-white transition-all ${formData.time ? 'bg-stone-800 hover:bg-black' : 'bg-stone-300'}`}
                                            >
                                                Set Custom Time
                                            </button>
                                        </motion.div>
                                    )}
                                </motion.section>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 4: VOICE/FINAL NOTE */}
                    {step === 4 && (
                        <motion.div key="step4" {...pageTransition} className="space-y-8 text-center">
                            <h2 className="text-3xl font-bold">Final briefing?</h2>
                            <p className="text-stone-600 font-medium">Share anything else I should know before we speak.</p>

                            <textarea
                                className="w-full bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-white shadow-sm outline-none focus:ring-2 ring-stone-800/20 h-32 resize-none text-center"
                                placeholder="Or type a quick note..."
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />

                            {submitError && (
                                <p className="text-red-600 text-sm font-medium">{submitError}</p>
                            )}

                            {/* Change 6: Upgraded Confirm Button */}
                            <motion.button
                                onClick={handleSubmit}
                                disabled={submitting}
                                animate={submitting ? {} : {
                                    boxShadow: [
                                        `0px 0px 0px 0px ${COLORS.oldGold}40`,
                                        `0px 0px 20px 8px ${COLORS.oldGold}60`,
                                        `0px 0px 0px 0px ${COLORS.oldGold}40`
                                    ]
                                }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                                style={{
                                    backgroundImage: `linear-gradient(135deg, ${COLORS.blackCherry}, ${COLORS.oldGold})`,
                                    backgroundSize: '200% 200%'
                                }}
                                className="w-full py-6 text-white rounded-[2rem] font-bold text-2xl shadow-xl hover:opacity-90 transition-all bg-animate disabled:opacity-60"
                            >
                                {submitting ? 'Submitting...' : 'Confirm'}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* STEP 5: SUCCESS (Change 7) */}
                    {step === 5 && (
                        <motion.div key="step5" {...pageTransition} className="text-center space-y-6">
                            <h1 className="text-7xl font-bold tracking-tighter">Confirmed.</h1>
                            <p className="text-2xl text-stone-700 font-medium">
                                I’ll see you on {formData.day} for {formData.duration}.<br />
                                <span className="opacity-60 text-lg mt-2 block">
                                    ({formData.time} {formData.timeRangeEnd ? `- ${formData.timeRangeEnd}` : ''} EST)
                                </span>
                            </p>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* FOOTER & TIMEZONE CONVERTER (Change 2) */}
            <footer className="fixed bottom-0 w-full p-6 text-center text-xs font-bold tracking-widest uppercase text-stone-500 z-20">
                <div className="flex justify-center items-center gap-4">
                    <span>All times in EST</span>
                    <span className="h-3 w-[2px] bg-stone-400" />
                    <button
                        onClick={() => setShowTzModal(true)}
                        className="hover:text-stone-900 transition-colors cursor-pointer underline decoration-stone-400 underline-offset-4"
                    >
                        Compare with your local time
                    </button>
                </div>
            </footer>

            {/* TIMEZONE MODAL (Change 2) */}
            <AnimatePresence>
                {showTzModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full relative"
                        >
                            <button onClick={() => setShowTzModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-black font-bold text-xl">✕</button>
                            <h3 className="text-xl font-bold mb-6 text-center">Timezone Match</h3>
                            <div className="space-y-6">
                                <div className="p-4 bg-stone-100 rounded-2xl text-center">
                                    <p className="text-xs uppercase text-stone-500 font-bold mb-1">Your Local Time</p>
                                    <p className="text-2xl font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="flex justify-center text-stone-400">equals</div>
                                <div className="p-4 border-2 border-[var(--oldGold)] rounded-2xl text-center bg-[#E0D794]/20">
                                    <p className="text-xs uppercase text-[#550003] font-bold mb-1">Adeola's Time (EST)</p>
                                    <p className="text-2xl font-bold text-[#550003]">
                                        {new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

