import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const Landing = () => {
  const navigate = useNavigate();

  const handleCreateCompetition = () => {
    navigate('/login');
  };

  const handleGetStarted = () => {
    navigate('/register');
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.8 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <Header />

        {/* Hero Section - Completely Redesigned */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50">
          <div className="absolute inset-0 bg-[url('/images/golf-background.jpeg')] bg-cover bg-center opacity-5" />

          <div className="relative px-4 md:px-8 py-16 md:py-24 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

              {/* Left Column - Text Content */}
              <motion.div
                initial="initial"
                animate="animate"
                variants={staggerContainer}
                className="space-y-6 md:space-y-8"
              >
                {/* Badge */}
                <motion.div variants={fadeInUp}>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    #1 Golf Tournament Platform
                  </span>
                </motion.div>

                {/* Main Heading */}
                <motion.div variants={fadeInUp} className="space-y-4">
                  <div className="flex items-center gap-4 md:gap-6">
                    {/* Large Logo */}
                    <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        {/* Shield Background - Simple gradient */}
                        <path d="M32 6 L52 14 L52 32 Q52 46 32 58 Q12 46 12 32 L12 14 Z" fill="url(#shieldGradientLanding)" stroke="#1a5a2a" strokeWidth="2.5"/>

                        {/* Golf ball - White with strong contrast */}
                        <circle cx="32" cy="32" r="16" fill="white" stroke="#1a5a2a" strokeWidth="2.5"/>

                        {/* Simple dimples pattern */}
                        <circle cx="26" cy="26" r="2" fill="#2d7b3e" opacity="0.4"/>
                        <circle cx="32" cy="24" r="2" fill="#2d7b3e" opacity="0.4"/>
                        <circle cx="38" cy="26" r="2" fill="#2d7b3e" opacity="0.4"/>
                        <circle cx="24" cy="32" r="2" fill="#2d7b3e" opacity="0.4"/>
                        <circle cx="32" cy="32" r="2" fill="#2d7b3e" opacity="0.4"/>
                        <circle cx="40" cy="32" r="2" fill="#2d7b3e" opacity="0.4"/>
                        <circle cx="26" cy="38" r="2" fill="#2d7b3e" opacity="0.4"/>
                        <circle cx="32" cy="40" r="2" fill="#2d7b3e" opacity="0.4"/>
                        <circle cx="38" cy="38" r="2" fill="#2d7b3e" opacity="0.4"/>

                        {/* Golf flag - Simple and clean */}
                        <line x1="44" y1="24" x2="44" y2="40" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M44 24 L54 27 L54 33 L44 36 Z" fill="#D4AF37"/>

                        {/* Shine on ball */}
                        <circle cx="26" cy="26" r="4" fill="white" opacity="0.5"/>

                        <defs>
                          <linearGradient id="shieldGradientLanding" x1="32" y1="6" x2="32" y2="58">
                            <stop offset="0%" stopColor="#3a9d4f"/>
                            <stop offset="100%" stopColor="#1a5a2a"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-gray-900 font-poppins">
                      Welcome to{' '}
                      <span className="bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                        RyderCupFriends
                      </span>
                    </h1>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-12 bg-accent rounded-full" />
                    <span className="text-xl md:text-2xl font-bold text-primary">RCF</span>
                  </div>
                </motion.div>

                {/* Subtitle */}
                <motion.p
                  variants={fadeInUp}
                  className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl"
                >
                  The ultimate platform for organizing amateur golf tournaments in Ryder Cup format.
                  Connect with friends, create exciting competitions, and enjoy the spirit of friendly golf rivalry.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  variants={fadeInUp}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <button
                    onClick={handleGetStarted}
                    className="group relative px-8 py-4 bg-primary text-white text-base font-bold rounded-lg overflow-hidden transition-all duration-300 hover:bg-primary-600 hover:shadow-xl hover:scale-105"
                  >
                    <span className="relative z-10">Get Started Free</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>

                  <button
                    onClick={handleCreateCompetition}
                    className="px-8 py-4 bg-white text-primary text-base font-bold rounded-lg border-2 border-primary hover:bg-primary-50 transition-all duration-300 hover:shadow-lg hover:scale-105"
                  >
                    View Demo
                  </button>
                </motion.div>

                {/* Stats */}
                <motion.div
                  variants={fadeInUp}
                  className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200"
                >
                  <div>
                    <div className="text-3xl font-bold text-primary font-poppins">500+</div>
                    <div className="text-sm text-gray-600 mt-1">Tournaments</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary font-poppins">2K+</div>
                    <div className="text-sm text-gray-600 mt-1">Players</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary font-poppins">98%</div>
                    <div className="text-sm text-gray-600 mt-1">Satisfaction</div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column - Hero Image/Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="relative">
                  {/* Main Image Card */}
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                    <img
                      src="/images/hero-tournament.jpeg"
                      alt="Golf Tournament"
                      className="w-full h-[500px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Floating Card - Tournament Info */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.6 }}
                      className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-600">Next Tournament</div>
                          <div className="text-lg font-bold text-gray-900">Spring Classic 2024</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Players</div>
                          <div className="text-2xl font-bold text-primary">24</div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent rounded-full opacity-20 blur-2xl" />
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary rounded-full opacity-20 blur-2xl" />
                </div>
              </motion.div>

            </div>
          </div>

          {/* Wave Divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 0L60 10C120 20 240 40 360 45C480 50 600 40 720 35C840 30 960 30 1080 35C1200 40 1320 50 1380 55L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white"/>
            </svg>
          </div>
        </section>

        {/* Features Section - Redesigned */}
        <section id="features" className="px-4 md:px-8 py-16 md:py-24 max-w-7xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-12"
          >
            {/* Section Header */}
            <motion.div variants={fadeInUp} className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 font-poppins">
                Everything You Need to Run Your Tournament
              </h2>
              <p className="text-lg text-gray-600">
                Professional-grade tools designed for amateur golfers. Simple, powerful, and fun to use.
              </p>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {/* Feature 1 */}
              <motion.div
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-primary hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M232,64H208V56a16,16,0,0,0-16-16H64A16,16,0,0,0,48,56v8H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-poppins">Handicap Management</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Automatically calculate and manage handicaps for all players to ensure fair and competitive play.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-primary hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-accent-400/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-accent-600 group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-poppins">Ryder Cup Format</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Easily set up the classic Ryder Cup format with foursomes, fourballs, and singles matches.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-primary hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-navy-800/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-navy-800 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-navy-800 group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-poppins">Team Management</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Create balanced teams, track player statistics, and manage team rosters with ease.
                </p>
              </motion.div>

              {/* Feature 4 */}
              <motion.div
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-primary hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M216,40H136V24a8,8,0,0,0-16,0V40H40A16,16,0,0,0,24,56V176a16,16,0,0,0,16,16H79.36L57.75,219a8,8,0,0,0,12.5,10l29.59-37h56.32l29.59,37a8,8,0,1,0,12.5-10l-21.61-27H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-poppins">Live Scoring</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Real-time score updates keep everyone engaged and following the action as it happens.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Benefits Section */}
        <section className="bg-gradient-to-br from-primary-50 to-accent-50 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
              {/* Left - Image */}
              <motion.div variants={fadeInUp} className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="/images/golf-friends.jpeg"
                    alt="Golf Friends"
                    className="w-full h-[400px] object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-6 shadow-xl max-w-xs hidden md:block">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Easy Setup</div>
                      <div className="text-sm text-gray-600">5 minutes to start</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right - Benefits List */}
              <motion.div variants={staggerContainer} className="space-y-6">
                <motion.div variants={fadeInUp}>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 font-poppins">
                    Why Choose RyderCupFriends?
                  </h2>
                  <p className="text-lg text-gray-600">
                    Built by golfers, for golfers. We understand what makes a great tournament experience.
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp} className="space-y-4">
                  {[
                    { title: 'Simple & Intuitive', desc: 'No complicated setup. Get started in minutes.' },
                    { title: 'Mobile Friendly', desc: 'Manage your tournament from anywhere, on any device.' },
                    { title: 'Fair Competition', desc: 'Advanced handicap system ensures everyone has a chance to win.' },
                    { title: 'Community Focused', desc: 'Connect with fellow golf enthusiasts and build lasting friendships.' }
                  ].map((benefit, idx) => (
                    <motion.div
                      key={idx}
                      variants={fadeInUp}
                      className="flex gap-4 items-start"
                    >
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{benefit.title}</h4>
                        <p className="text-gray-600 text-sm">{benefit.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 px-4 md:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="max-w-4xl mx-auto text-center bg-gradient-to-br from-primary to-primary-700 rounded-3xl p-12 md:p-16 relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 font-poppins">
                Ready to Organize Your Next Tournament?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of golfers already using RyderCupFriends to create unforgettable tournaments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-white text-primary text-base font-bold rounded-lg hover:bg-gray-50 transition-all duration-300 hover:shadow-xl hover:scale-105"
                >
                  Start Free Today
                </button>
                <button
                  onClick={() => window.location.href = '#features'}
                  className="px-8 py-4 bg-transparent text-white text-base font-bold rounded-lg border-2 border-white hover:bg-white/10 transition-all duration-300"
                >
                  Learn More
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Landing;
