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
        initial: { opacity: 0, y: 60, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -60, scale: 0.97 },
        transition: { type: 'spring' as const, damping: 28, stiffness: 220, mass: 0.8 }
    };

    const nextStep = () => setStep(s => s + 1);

    return (
        <div style={{
            backgroundColor: COLORS.vanillaCustard,
            color: COLORS.text,
            fontFamily: "'Comfortaa', sans-serif"
        }} className="min-h-screen relative overflow-hidden transition-colors duration-500 z-0">

            {/* ORGANIC LAVA LAMP BACKGROUND */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none opacity-30 mix-blend-multiply">
                <motion.div
                    animate={{
                        x: [0, 180, -120, 60, 0],
                        y: [0, -180, 80, -40, 0],
                        scale: [1, 1.25, 0.95, 1.15, 1],
                        rotate: [0, 10, -5, 5, 0]
                    }}
                    transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[130px]"
                    style={{ backgroundColor: COLORS.oldGold }}
                />
                <motion.div
                    animate={{
                        x: [0, -180, 120, -60, 0],
                        y: [0, 180, -80, 40, 0],
                        scale: [1, 1.35, 0.9, 1.1, 1],
                        rotate: [0, -8, 12, -4, 0]
                    }}
                    transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[150px]"
                    style={{ backgroundColor: COLORS.blackCherry, opacity: 0.5 }}
                />
                <motion.div
                    animate={{
                        x: [0, -100, 150, -50, 0],
                        y: [0, 120, -180, 60, 0],
                        scale: [1, 0.9, 1.3, 1.05, 1],
                        rotate: [0, 15, -10, 5, 0]
                    }}
                    transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[40%] left-[50%] w-[40vw] h-[40vw] rounded-full blur-[100px]"
                    style={{ backgroundColor: COLORS.vanillaCustard, opacity: 0.3 }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="max-w-xl mx-auto px-8 py-20 flex flex-col justify-center min-h-screen relative z-10"
            >
                <AnimatePresence mode="wait">

                    {/* STEP 0: INITIAL GREETING & FIRST MEETING CHECK */}
                    {step === 0 && (
                        <motion.div key="step0" {...pageTransition} className="text-center space-y-12">
                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, type: 'spring', damping: 25, stiffness: 200 }}
                                className="text-4xl font-bold tracking-tight leading-snug"
                            >
                                Looking forward to speaking with you.
                            </motion.h1>
                            <div className="space-y-8">
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-lg text-stone-600 font-medium"
                                >
                                    Is this our first meeting?
                                </motion.p>
                                <div className="flex justify-center gap-6">
                                    {['Yes', 'No'].map((label, i) => (
                                        <motion.button
                                            key={label}
                                            custom={i}
                                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ delay: 0.4 + i * 0.15, type: 'spring', damping: 20, stiffness: 250 }}
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.92 }}
                                            onClick={() => { setIsFirstMeeting(label === 'Yes'); nextStep(); }}
                                            className="px-10 py-4 bg-white/80 backdrop-blur-md rounded-full font-bold shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            {label}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 1: NAME INPUT */}
                    {step === 1 && (
                        <motion.div key="step1" {...pageTransition} className="text-center space-y-10">
                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, type: 'spring', damping: 22, stiffness: 180 }}
                                className="text-4xl font-light tracking-tight leading-snug"
                            >
                                {isFirstMeeting ? "Nice to meet you," : "Looking forward to speaking again,"}
                                <br />
                                <motion.span
                                    initial={{ opacity: 0, scaleX: 0.8 }}
                                    animate={{ opacity: 1, scaleX: 1 }}
                                    transition={{ delay: 0.3, type: 'spring', damping: 20, stiffness: 150 }}
                                    className="relative inline-block mt-6"
                                >
                                    <input
                                        autoFocus
                                        maxLength={40}
                                        className="bg-transparent border-b-[3px] border-stone-800/20 focus:border-stone-800 outline-none w-64 pb-2 text-4xl font-bold transition-all text-center"
                                        placeholder=" "
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && formData.name && nextStep()}
                                    />
                                </motion.span>
                            </motion.h1>
                            {formData.name && (
                                <motion.button
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                                    whileHover={{ scale: 1.06, y: -2 }}
                                    whileTap={{ scale: 0.94 }}
                                    onClick={nextStep}
                                    className="mt-8 px-8 py-3 bg-stone-800 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-shadow"
                                >
                                    Continue
                                </motion.button>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 2: REASON */}
                    {step === 2 && (
                        <motion.div key="step2" {...pageTransition} className="space-y-10 text-center">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, type: 'spring', damping: 22, stiffness: 180 }}
                                className="text-3xl font-bold"
                            >
                                What is the focus of our sync?
                            </motion.h2>
                            <div className="flex justify-center gap-4">
                                {['Inquiry', 'Joint Venture'].map((type, i) => (
                                    <motion.button
                                        key={type}
                                        custom={i}
                                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: 0.25 + i * 0.15, type: 'spring', damping: 22, stiffness: 230 }}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        whileTap={{ scale: 0.93 }}
                                        onClick={() => { setFormData({ ...formData, reason: type }); nextStep(); }}
                                        className="relative overflow-hidden px-8 py-4 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow text-lg font-bold border border-white"
                                    >
                                        {type}
                                        <motion.span
                                            whileTap={{ scale: 4, opacity: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="absolute inset-0 bg-stone-200 rounded-full pointer-events-none opacity-0 group-active:opacity-100"
                                        />
                                    </motion.button>
                                ))}
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.55, type: 'spring', damping: 22, stiffness: 180 }}
                                className="max-w-md mx-auto space-y-4 pt-4"
                            >
                                <p className="text-sm uppercase tracking-widest text-stone-600 font-bold">Or a few words...</p>
                                <input
                                    className="w-full bg-transparent border-b-2 border-stone-800/20 py-3 outline-none focus:border-stone-800 transition-all text-xl text-center"
                                    placeholder="Context (optional)"
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && nextStep()}
                                />
                            </motion.div>
                        </motion.div>
                    )}

                    {/* STEP 3: DATE, DURATION & TIME */}
                    {step === 3 && (
                        <motion.div key="step3" {...pageTransition} className="space-y-12">

                            {/* Day Selection */}
                            <section>
                                <motion.h3
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.15 }}
                                    className="text-stone-600 uppercase text-xs tracking-widest font-bold mb-4 text-center"
                                >
                                    Select a Day
                                </motion.h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {DAYS.map((day, i) => (
                                        <motion.button
                                            key={day}
                                            custom={i}
                                            initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ delay: 0.2 + i * 0.08, type: 'spring', damping: 22, stiffness: 240 }}
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.92 }}
                                            onClick={() => setFormData({ ...formData, day })}
                                            className={`px-5 py-3 rounded-2xl border-2 font-bold transition-shadow ${formData.day === day ? 'bg-stone-800 text-white border-stone-800 shadow-md' : 'bg-white/60 border-transparent hover:bg-white shadow-sm'}`}
                                        >
                                            {day.slice(0, 3)}
                                        </motion.button>
                                    ))}
                                </div>
                            </section>

                            {/* Duration Selection */}
                            {formData.day && (
                                <motion.section
                                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className="space-y-4 text-center"
                                >
                                    <h3 className="text-stone-600 uppercase text-xs tracking-widest font-bold mb-4">Expected Duration</h3>
                                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                                        {DURATIONS.map((dur, i) => (
                                            <motion.button
                                                key={dur}
                                                custom={i}
                                                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: i * 0.08, type: 'spring', damping: 22, stiffness: 240 }}
                                                whileHover={{ scale: 1.04, y: -2 }}
                                                whileTap={{ scale: 0.93 }}
                                                onClick={() => setFormData({ ...formData, duration: dur })}
                                                className={`py-3 rounded-xl border-2 font-bold text-sm transition-shadow ${formData.duration === dur ? 'bg-stone-800 text-white border-stone-800 shadow-md' : 'bg-white/60 border-transparent hover:bg-white shadow-sm'}`}
                                            >
                                                {dur}
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.section>
                            )}

                            {/* Time Selection */}
                            {formData.duration && (
                                <motion.section
                                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className="space-y-3"
                                >
                                    <h3 className="text-stone-600 uppercase text-xs tracking-widest font-bold mb-4 text-center">Available Times (EST)</h3>

                                    {/* 3 Standard Options */}
                                    {!showCustomTime && STANDARD_TIMES.map((time, i) => (
                                        <motion.button
                                            key={time}
                                            custom={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1, type: 'spring', damping: 22, stiffness: 200 }}
                                            whileHover={{ scale: 1.02, x: 4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => { setFormData({ ...formData, time }); nextStep(); }}
                                            className="w-full p-6 text-left bg-white/80 backdrop-blur-sm shadow-sm border border-white rounded-3xl text-xl font-bold hover:shadow-md transition-shadow flex justify-between items-center group"
                                        >
                                            <span>{time}</span>
                                            <motion.span
                                                initial={{ x: -5, opacity: 0 }}
                                                whileHover={{ x: 3, opacity: 1 }}
                                                className="text-sm font-normal text-stone-400"
                                            >
                                                Select →
                                            </motion.span>
                                        </motion.button>
                                    ))}

                                    {/* 4th Option: Request Time */}
                                    {!showCustomTime ? (
                                        <motion.button
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowCustomTime(true)}
                                            className="w-full p-6 bg-transparent border-2 border-stone-800/20 border-dashed rounded-3xl text-lg font-bold text-stone-700 hover:border-stone-800 hover:text-stone-900 transition-colors flex justify-center items-center"
                                        >
                                            Request a specific time
                                        </motion.button>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.93, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.93, y: -10 }}
                                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                                            className="p-6 bg-white/90 backdrop-blur-md rounded-3xl shadow-lg space-y-6 origin-top"
                                        >
                                            <motion.h4
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="font-bold text-center"
                                            >
                                                Propose a Time
                                            </motion.h4>
                                            <div className="flex items-center gap-4 justify-center">
                                                <motion.input
                                                    initial={{ scale: 0.95, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: 0.15 }}
                                                    type="time"
                                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                    className="p-3 bg-stone-100 rounded-xl outline-none font-bold text-lg focus:ring-2 focus:ring-stone-800/20 transition-all"
                                                />
                                                <motion.span
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.2 }}
                                                    className="text-stone-400 font-bold"
                                                >
                                                    to
                                                </motion.span>
                                                <motion.input
                                                    initial={{ scale: 0.95, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: 0.2 }}
                                                    type="time"
                                                    onChange={(e) => setFormData({ ...formData, timeRangeEnd: e.target.value })}
                                                    className="p-3 bg-stone-100 rounded-xl outline-none font-bold text-lg focus:ring-2 focus:ring-stone-800/20 transition-all"
                                                />
                                            </div>
                                            <p className="text-xs text-center text-stone-500 font-medium">Second time is optional if you want to provide an availability window.</p>
                                            <motion.button
                                                whileHover={formData.time ? { scale: 1.03 } : {}}
                                                whileTap={formData.time ? { scale: 0.97 } : {}}
                                                onClick={() => formData.time && nextStep()}
                                                className={`w-full py-4 rounded-xl font-bold text-white transition-all ${formData.time ? 'bg-stone-800 hover:bg-black shadow-md' : 'bg-stone-300'}`}
                                            >
                                                Set Custom Time
                                            </motion.button>
                                        </motion.div>
                                    )}
                                </motion.section>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 4: FINAL NOTE */}
                    {step === 4 && (
                        <motion.div key="step4" {...pageTransition} className="space-y-8 text-center">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, type: 'spring', damping: 22, stiffness: 180 }}
                                className="text-3xl font-bold"
                            >
                                Final briefing?
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-stone-600 font-medium"
                            >
                                Share anything else I should know before we speak.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25, type: 'spring', damping: 22, stiffness: 180 }}
                            >
                                <textarea
                                    className="w-full bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-white shadow-sm outline-none focus:ring-2 focus:ring-stone-800/30 h-32 resize-none text-center transition-all"
                                    placeholder="Or type a quick note..."
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                />
                            </motion.div>

                            {submitError && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-600 text-sm font-medium"
                                >
                                    {submitError}
                                </motion.p>
                            )}

                            {/* Upgraded Confirm Button with organic pulse */}
                            <motion.button
                                onClick={handleSubmit}
                                disabled={submitting}
                                animate={submitting ? {
                                    scale: [1, 0.98, 1],
                                    opacity: [1, 0.7, 1]
                                } : {
                                    boxShadow: [
                                        `0px 0px 0px 0px ${COLORS.oldGold}30`,
                                        `0px 0px 25px 10px ${COLORS.oldGold}50`,
                                        `0px 0px 0px 0px ${COLORS.oldGold}30`
                                    ],
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                style={{
                                    backgroundImage: `linear-gradient(135deg, ${COLORS.blackCherry}, ${COLORS.oldGold}, ${COLORS.blackCherry})`,
                                    backgroundSize: '200% 200%'
                                }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96 }}
                                className="w-full py-6 text-white rounded-[2rem] font-bold text-2xl shadow-xl transition-shadow disabled:opacity-60 disabled:scale-100"
                            >
                                {submitting ? (
                                    <motion.span
                                        animate={{ opacity: [1, 0.4, 1] }}
                                        transition={{ duration: 1.2, repeat: Infinity }}
                                    >
                                        Submitting...
                                    </motion.span>
                                ) : 'Confirm'}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* STEP 5: SUCCESS */}
                    {step === 5 && (
                        <motion.div key="step5" className="text-center space-y-8">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.6, rotateZ: -5 }}
                                animate={{ opacity: 1, scale: 1, rotateZ: 0 }}
                                transition={{ type: 'spring', damping: 18, stiffness: 180, mass: 0.8 }}
                            >
                                <motion.h1
                                    animate={{
                                        textShadow: [
                                            `0 0 0px ${COLORS.oldGold}00`,
                                            `0 0 30px ${COLORS.oldGold}40`,
                                            `0 0 0px ${COLORS.oldGold}00`
                                        ]
                                    }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                    className="text-7xl font-bold tracking-tighter"
                                    style={{ color: COLORS.blackCherry }}
                                >
                                    Confirmed.
                                </motion.h1>
                            </motion.div>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, type: 'spring', damping: 22, stiffness: 180 }}
                                className="text-2xl text-stone-700 font-medium"
                            >
                                I'll see you on {formData.day} for {formData.duration}.<br />
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.6 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-lg mt-2 block"
                                >
                                    ({formData.time} {formData.timeRangeEnd ? `- ${formData.timeRangeEnd}` : ''} EST)
                                </motion.span>
                            </motion.p>
                        </motion.div>
                    )}

                </AnimatePresence>
            </motion.div>

            {/* FOOTER & TIMEZONE CONVERTER */}
            <motion.footer
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="fixed bottom-0 w-full p-6 text-center text-xs font-bold tracking-widest uppercase text-stone-500 z-20"
            >
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
            </motion.footer>

            {/* TIMEZONE MODAL */}
            <AnimatePresence>
                {showTzModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.88, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.88, y: 30 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
                            className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full relative"
                        >
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', damping: 15 }}
                                onClick={() => setShowTzModal(false)}
                                className="absolute top-4 right-4 text-stone-400 hover:text-black font-bold text-xl"
                            >
                                ✕
                            </motion.button>
                            <motion.h3
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-xl font-bold mb-6 text-center"
                            >
                                Timezone Match
                            </motion.h3>
                            <div className="space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.15 }}
                                    className="p-4 bg-stone-100 rounded-2xl text-center"
                                >
                                    <p className="text-xs uppercase text-stone-500 font-bold mb-1">Your Local Time</p>
                                    <p className="text-2xl font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.25, type: 'spring', damping: 14, stiffness: 180 }}
                                    className="flex justify-center"
                                >
                                    <span className="text-stone-400 font-bold text-lg">=</span>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                    whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    className="p-4 border-2 border-[var(--oldGold)] rounded-2xl text-center bg-[#E0D794]/20 transition-shadow"
                                >
                                    <p className="text-xs uppercase text-[#550003] font-bold mb-1">Adeola's Time (EST)</p>
                                    <p className="text-2xl font-bold text-[#550003]">
                                        {new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

