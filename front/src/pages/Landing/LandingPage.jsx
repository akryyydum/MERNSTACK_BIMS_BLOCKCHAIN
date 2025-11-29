import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, X, Users, FileText, Shield, Bell, 
  CreditCard, Clock, CheckCircle, TrendingUp, 
  Database, Lock, Zap, Award, ChevronRight,
  MapPin, Phone, Mail, Calendar, MessageCircle,
  BarChart3, Globe, Smartphone, HeartHandshake
} from 'lucide-react';
import { useState, useEffect } from 'react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Users className="w-12 h-12" />,
      title: "Resident Management",
      description: "Efficiently manage resident information and household data with our comprehensive system.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <FileText className="w-12 h-12" />,
      title: "Document Requests",
      description: "Streamlined document request and processing for barangay certificates and clearances.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Shield className="w-12 h-12" />,
      title: "Blockchain Security",
      description: "Secure and transparent record-keeping powered by blockchain technology.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <Bell className="w-12 h-12" />,
      title: "Real-time Notifications",
      description: "Stay updated with instant notifications for requests, payments, and announcements.",
      color: "from-orange-500 to-orange-600"
    },

    {
      icon: <BarChart3 className="w-12 h-12" />,
      title: "Analytics & Reports",
      description: "Comprehensive reporting and data visualization for better decision-making.",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      icon: <MessageCircle className="w-12 h-12" />,
      title: "Complaints Management",
      description: "Easy submission and tracking of barangay complaints and concerns.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: <HeartHandshake className="w-12 h-12" />,
      title: "Community Services",
      description: "Access various barangay services and programs all in one place.",
      color: "from-teal-500 to-teal-600"
    }
  ];

  const benefits = [
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Save Time",
      description: "Process requests 70% faster than traditional methods"
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Secure Data",
      description: "Bank-level encryption with blockchain verification"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Instant Updates",
      description: "Real-time notifications for all transactions"
    }
  ];

  const services = [
    { name: "Barangay Clearance", time: "24-48 hours", icon: <FileText className="w-6 h-6" /> },
    { name: "Certificate of Indigency", time: "24-48 hours", icon: <FileText className="w-6 h-6" /> },
    { name: "Certificate of Residency", time: "24-48 hours", icon: <FileText className="w-6 h-6" /> }
  ];

  const faqItems = [
    {
      question: "How do I register for an account?",
      answer: "Click on 'Get Started' or 'Login' button, then select 'Register'. Fill in your personal information and required documents. After submission, wait for admin approval to activate your account."
    },
    {
      question: "What documents are required?",
      answer: "For registration, you need a valid ID, proof of residency, and recent photo. For document requests, requirements vary depending on the type of document you're requesting."
    },
    {
      question: "How long does processing take?",
      answer: "Most certificates like Barangay Clearance, Certificate of Indigency, and Certificate of Residency take 24-48 hours to process after approval and payment."
    },
    {
      question: "Can I track my request?",
      answer: "Yes! Once logged in, you can track all your document requests in real-time through your dashboard. You'll also receive notifications for any status updates."
    },
    {
      question: "How do I pay for document requests?",
      answer: "Payment should be made directly at the Barangay Hall. After your request is approved, you'll be notified to visit the office for payment and document pickup."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely! We use blockchain technology and bank-level encryption to ensure your data is secure and tamper-proof. All transactions are recorded transparently."
    }
  ];

  const stats = [
    { number: "500+", label: "Active Residents", icon: <Users className="w-6 h-6" /> },
    { number: "1,000+", label: "Documents Issued", icon: <FileText className="w-6 h-6" /> },
    { number: "95%", label: "Satisfaction Rate", icon: <CheckCircle className="w-6 h-6" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Title */}
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img 
                src="/logo.png" 
                alt="Barangay Logo" 
                className="h-14 w-14 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-blue-600">La Torre North, Bayombong, N.V.</span>
                <span className="text-xs text-blue-500">Barangay Management Information System</span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-center gap-8">
                                <button
                                  className="text-blue-700 font-bold tracking-wide hover:text-blue-900 transition-colors bg-transparent border-none cursor-pointer px-4 py-1"
                                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                >
                                  Home
                                </button>
                <button
                  className="text-blue-700 font-bold tracking-wide hover:text-blue-900 transition-colors bg-transparent border-none cursor-pointer px-4 py-1"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Features
                </button>
                <button
                  className="text-blue-700 font-bold tracking-wide hover:text-blue-900 transition-colors bg-transparent border-none cursor-pointer px-4 py-1"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Services
                </button>
                <button
                  className="text-blue-700 font-bold tracking-wide hover:text-blue-900 transition-colors bg-transparent border-none cursor-pointer px-4 py-1"
                  onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  About
                </button>
                <button
                  className="text-blue-700 font-bold tracking-wide hover:text-blue-900 transition-colors bg-transparent border-none cursor-pointer px-4 py-1"
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Contact
                </button>
                <motion.button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-900 transition-all shadow-md hover:shadow-lg ml-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Login
                </motion.button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white hover:text-blue-200 transition-colors"
              >
                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden pb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-white hover:text-blue-200 transition-colors font-medium">
                  Features
                </a>
                <a href="#services" className="text-white hover:text-blue-200 transition-colors font-medium">
                  Services
                </a>
                <a href="#about" className="text-white hover:text-blue-200 transition-colors font-medium">
                  About
                </a>
                <a href="#contact" className="text-white hover:text-blue-200 transition-colors font-medium">
                  Contact
                </a>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-all text-center"
                >
                  Login
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div 
          className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{ 
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <div className="max-w-3xl w-full mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6 text-sm font-semibold"
            >
              <Zap className="w-4 h-4" />
              Powered by Blockchain Technology
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6 text-center">
              Welcome to <span className="text-blue-600">TransparaBrgy</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed text-center">
              A modern, secure, and efficient barangay management system powered by blockchain technology. 
              Simplifying governance and services for our community.
            </p>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 w-full">
              {stats.slice(0, 3).map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl font-bold text-blue-600">{stat.number}</div>
                  <div className="text-xs text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
              <motion.button
                onClick={() => navigate('/login')}
                className="group px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-white">Get Started</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View Services
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-center items-center gap-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-6 text-white"
              >
                <div className="flex-shrink-0 bg-white/20 p-6 rounded-xl">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-xl mb-2">{benefit.title}</h3>
                  <p className="text-blue-100 text-base">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              System Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the powerful features that make our barangay management system efficient and user-friendly
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <div className={`relative mb-6 inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                <motion.div
                  className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={{ x: -10 }}
                  whileHover={{ x: 0 }}
                >
                  <ChevronRight className="w-6 h-6 text-blue-600" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Available Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Quick and efficient processing of all your barangay document needs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all flex items-center gap-4 cursor-pointer border-l-4 border-blue-600"
              >
                <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg text-blue-600">
                  {service.icon}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-gray-900 mb-1">{service.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{service.time}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg inline-flex items-center gap-2"
            >
              <span className="text-white">Request a Service</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq-section" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Find answers to common questions about our services
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqItems.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-lg pr-8">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <ChevronRight className="w-6 h-6 text-blue-600 transform rotate-90" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '50px 50px']
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Our Impact in Numbers
            </h2>
            <p className="text-xl text-blue-100">
              Making a difference in our community every day
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: 'spring' }}
                className="text-center"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  {stat.icon}
                </motion.div>
                <motion.div
                  className="text-5xl font-bold mb-2"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  {stat.number}
                </motion.div>
                <div className="text-blue-100 text-lg">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                About La Torre North
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                La Torre North is a progressive barangay in Bayombong, Nueva Vizcaya, committed to 
                providing excellent service to our residents through modern technology and transparent governance.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                Our Barangay Management Information System represents our dedication to innovation and efficiency, 
                leveraging blockchain technology to ensure security, transparency, and reliability in all our services.
              </p>
              
              <div className="space-y-4">
                <motion.div 
                  className="flex items-center gap-4"
                  whileHover={{ x: 10 }}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Transparent Governance</h3>
                    <p className="text-gray-600 text-sm">Open and accountable to our community</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="flex items-center gap-4"
                  whileHover={{ x: 10 }}
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure & Reliable</h3>
                    <p className="text-gray-600 text-sm">Protected by blockchain technology</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="flex items-center gap-4"
                  whileHover={{ x: 10 }}
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Community-Focused</h3>
                    <p className="text-gray-600 text-sm">Designed with residents in mind</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 p-8 rounded-2xl text-white shadow-lg"
                >
                  <Database className="w-8 h-8 mb-4" />
                  <div className="text-3xl font-bold mb-2">100%</div>
                  <div className="text-blue-100">Digital Records</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-2xl text-white shadow-lg mt-8"
                >
                  <TrendingUp className="w-8 h-8 mb-4" />
                  <div className="text-3xl font-bold mb-2">70%</div>
                  <div className="text-green-100">Faster Processing</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-purple-500 to-purple-600 p-8 rounded-2xl text-white shadow-lg"
                >
                  <Globe className="w-8 h-8 mb-4" />
                  <div className="text-3xl font-bold mb-2">24/7</div>
                  <div className="text-purple-100">Online Access</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-2xl text-white shadow-lg mt-8"
                >
                  <Smartphone className="w-8 h-8 mb-4" />
                  <div className="text-3xl font-bold mb-2">Mobile</div>
                  <div className="text-orange-100">Responsive</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get your documents in just a few simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Create Account", description: "Sign up and verify your identity", icon: <Users className="w-8 h-8" /> },
              { step: "2", title: "Submit Request", description: "Select the document you need", icon: <FileText className="w-8 h-8" /> },
              { step: "3", title: "Pay at Barangay", description: "Visit the office for payment", icon: <MapPin className="w-8 h-8" /> },
              { step: "4", title: "Receive Document", description: "Get notified when ready", icon: <Bell className="w-8 h-8" /> }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-all">
                  <motion.div
                    className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {item.step}
                  </motion.div>
                  <div className="text-blue-600 mb-4 flex justify-center">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-8 h-8 text-blue-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600">
              Have questions or need assistance? We're here to help!
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
                
                <div className="space-y-6">
                  <motion.div 
                    className="flex items-start gap-4"
                    whileHover={{ x: 5 }}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
                      <p className="text-gray-600">La Torre North, Bayombong, Nueva Vizcaya</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex items-start gap-4"
                    whileHover={{ x: 5 }}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Office Hours</h4>
                      <p className="text-gray-600">Monday - Friday: 8:00 AM - 5:00 PM</p>
                      <p className="text-gray-600">Saturday: 8:00 AM - 12:00 PM</p>
                      <p className="text-gray-500 text-sm mt-1">Closed on Sundays and Holidays</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex items-start gap-4"
                    whileHover={{ x: 5 }}
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Contact Number</h4>
                      <p className="text-gray-600">Available through the system</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex items-start gap-4"
                    whileHover={{ x: 5 }}
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                      <p className="text-gray-600">barangay.latorre@bayombong.gov.ph</p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-2xl text-white shadow-lg"
              >
                <h3 className="text-2xl font-bold mb-4">Need Immediate Assistance?</h3>
                <p className="text-blue-100 mb-6">
                  For urgent matters, you can visit our office during business hours or access our online services 24/7.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  Access Online Services
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            </motion.div>

            {/* Map Section */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-800">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <MapPin className="w-6 h-6" />
                    Our Location
                  </h3>
                </div>
                <div className="relative w-full h-96">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!4v1764332783284!6m8!1m7!1sMVtTV7VDjqSb5Nljnp3R2g!2m2!1d16.49764131499667!2d121.1381234669432!3f291.84632846265043!4f-1.7009036971380027!5f0.7820865974627469"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="La Torre North Barangay Location"
                    className="w-full h-full"
                  />
                </div>
                <div className="p-4 bg-gray-50">
                  <p className="text-gray-700 text-sm">
                    <strong>La Torre North Barangay Hall</strong><br />
                    Bayombong, Nueva Vizcaya
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 opacity-10"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%']
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
          style={{
            backgroundImage: 'linear-gradient(45deg, #ffffff 25%, transparent 25%, transparent 75%, #ffffff 75%, #ffffff), linear-gradient(45deg, #ffffff 25%, transparent 25%, transparent 75%, #ffffff 75%, #ffffff)',
            backgroundSize: '60px 60px',
            backgroundPosition: '0 0, 30px 30px'
          }}
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join hundreds of residents already enjoying the convenience of our digital services. 
              Experience faster, easier, and more transparent barangay transactions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={() => navigate('/login')}
                className="px-10 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all shadow-xl inline-flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Create Account Now
                <ChevronRight className="w-6 h-6" />
              </motion.button>
              <motion.button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Learn More
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img 
                  src="logo.png" 
                  alt="Barangay Logo" 
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <div className="font-bold text-lg">La Torre North</div>
                  <div className="text-sm text-gray-400">Bayombong, Nueva Vizcaya</div>
                </div>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Empowering our community through modern technology and transparent governance. 
                Building a better tomorrow, today.
              </p>
              <div className="flex gap-4">
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                </motion.a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {['Home', 'Features', 'Services', 'About', 'Contact'].map((link, index) => (
                  <li key={index}>
                    <a 
                      href={`#${link.toLowerCase()}`}
                      className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="font-bold text-lg mb-4">Services</h3>
              <ul className="space-y-2">
                {['Barangay Clearance', 'Certificates', 'Permits', 'Payments', 'Complaints'].map((service, index) => (
                  <li key={index}>
                    <a 
                      href="#services"
                      className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      {service}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                © 2025 La Torre North Barangay. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Sitemap
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll to Top Button */}
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all z-50"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: scrollY > 500 ? 1 : 0,
            scale: scrollY > 500 ? 1 : 0
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="w-6 h-6 transform -rotate-90" />
        </motion.button>
      </footer>
    </div>
  );
};

export default LandingPage;
