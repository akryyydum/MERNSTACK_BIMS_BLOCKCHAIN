import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, X, Users, FileText, Shield, Bell, 
  CreditCard, Clock, CheckCircle, TrendingUp, 
  Database, Lock, Zap, Award, ChevronRight,
  MapPin, Phone, Mail, Calendar, MessageCircle,
  BarChart3, Globe, Smartphone, HeartHandshake, ArrowUp,
  Megaphone
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import SpotlightCard from '../../components/ui/SpotlightCard';
import heroFallback from '../../assets/bg.jpg';
import dayjs from 'dayjs';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState('');
  const [selectedAnnouncementIndex, setSelectedAnnouncementIndex] = useState(0);
  const navItemRefs = {
    home: useRef(null),
    features: useRef(null),
    services: useRef(null),
    about: useRef(null),
    contact: useRef(null)
  };

  const apiBaseUrl = useMemo(() => (
    (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')
  ), []);

  const heroSlides = useMemo(() => {
    const remoteImages = [
      'https://ik.imagekit.io/hmx0zyuip/La%20Torre%20North/bg.jpg',
      'https://ik.imagekit.io/hmx0zyuip/La%20Torre%20North/316d061d-e9f4-44b1-9b1a-e61c139966f8.jpg',
      'https://ik.imagekit.io/hmx0zyuip/La%20Torre%20North/1e725f2c-469c-4a45-b8d1-eeeec75a2eb2.jpg'
    ].filter(Boolean);
    return remoteImages.length ? remoteImages : [heroFallback];
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setShowScrollTop(currentScrollY > 300);
      
      // Determine active section based on scroll position
      const sections = ['home', 'features', 'services', 'about', 'contact'];
      const navHeight = 80;
      
      // Check if we're near the top (home section)
      if (currentScrollY < 200) {
        setActiveSection('home');
        return;
      }
      
      // Check other sections
      for (const section of sections.slice(1)) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= navHeight + 100 && rect.bottom >= navHeight + 100) {
            setActiveSection(section);
            return;
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Call once on mount
    
    // Prevent horizontal scrolling
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.style.overflowX = 'auto';
      document.documentElement.style.overflowX = 'auto';
    };
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Update indicator position when active section changes
  useEffect(() => {
    const updateIndicatorPosition = () => {
      const activeRef = navItemRefs[activeSection];
      if (activeRef?.current) {
        const rect = activeRef.current.getBoundingClientRect();
        const navRect = activeRef.current.closest('nav').getBoundingClientRect();
        setIndicatorStyle({
          left: rect.left - navRect.left,
          width: rect.width
        });
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(updateIndicatorPosition, 50);
    
    // Also update on window resize
    window.addEventListener('resize', updateIndicatorPosition);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateIndicatorPosition);
    };
  }, [activeSection]);

  // Close mobile menu when clicking outside or on escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest('nav') && !event.target.closest('[data-mobile-menu]')) {
        setMobileMenuOpen(false);
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    
    if (mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let isMounted = true;

    const fetchAnnouncements = async () => {
      setAnnouncementsLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/public/announcements`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch announcements');
        }

        const data = await response.json();
        if (isMounted) {
          setAnnouncements(Array.isArray(data) ? data : []);
          setSelectedAnnouncementIndex(0);
          setAnnouncementsError('');
        }
      } catch (error) {
        if (isMounted) {
          console.error('Announcements fetch error:', error);
          setAnnouncements([]);
          setAnnouncementsError('Announcements are temporarily unavailable.');
        }
      } finally {
        if (isMounted) {
          setAnnouncementsLoading(false);
        }
      }
    };

    fetchAnnouncements();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

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
    { 
      name: "Barangay Clearance", 
      time: "0 - 24 hours", 
      icon: <FileText className="w-6 h-6" />,
      description: "Required for employment, business permits, and other legal transactions."
    },
    { 
      name: "Certificate of Indigency", 
      time: "0 - 24 hours", 
      icon: <FileText className="w-6 h-6" />,
      description: "For financial assistance, medical aid, and government support programs."
    },
    { 
      name: "Certificate of Residency", 
      time: "0 - 24 hours", 
      icon: <FileText className="w-6 h-6" />,
      description: "Proof of residence for school enrollment, bank accounts, and official documents."
    },
    { 
      name: "Complaints Management", 
      time: "Immediate Response", 
      icon: <MessageCircle className="w-6 h-6" />,
      description: "Submit and track barangay complaints, concerns, and community issues efficiently."
    },
    { 
      name: "Service Reports", 
      time: "Real-time", 
      icon: <BarChart3 className="w-6 h-6" />,
      description: "View comprehensive reports and analytics on barangay services and activities."
    }
  ];

  const faqItems = [
    {
      question: "How do I register for an account?",
      answer: "Click on 'Get Started' or 'Login' button, then select 'Register'. Fill in your personal information and required documents. After submission, wait for admin approval to activate your account."
    },
    {
      question: "How long does processing take?",
      answer: "Most certificates like Barangay Clearance, Certificate of Indigency, and Certificate of Residency take 0 to 24 hours to process after approval and payment depending on the type of request and number of requests."
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
    { number: "Transparency", label: "Active Residents", icon: <Users className="w-6 h-6" /> },
    { number: "1,000+", label: "Documents Issued", icon: <FileText className="w-6 h-6" /> },
    { number: "95%", label: "Satisfaction Rate", icon: <CheckCircle className="w-6 h-6" /> }
  ];

  const { latestAnnouncement, previousAnnouncements } = useMemo(() => {
    if (!announcements.length) {
      return { latestAnnouncement: null, previousAnnouncements: [] };
    }
    const clampedIndex = Math.min(selectedAnnouncementIndex, announcements.length - 1);
    const latest = announcements[clampedIndex];
    const previous = announcements
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => index !== clampedIndex)
      .slice(0, 4);
    return { latestAnnouncement: latest, previousAnnouncements: previous };
  }, [announcements, selectedAnnouncementIndex]);

  const hasPreviousAnnouncements = previousAnnouncements.length > 0;

  const formatAnnouncementDate = (value) => {
    if (!value) return 'Date unavailable';
    return dayjs(value).format('MMMM D, YYYY');
  };

  const truncateText = (text = '', limit = 180) => {
    if (!text) return 'No description available.';
    return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
  };

  const getAnnouncementImageUrl = (announcement) => {
    if (!announcement?._id || !announcement?.mimeType) {
      return null;
    }
    if (!/^image\//i.test(announcement.mimeType)) {
      return null;
    }
    return `${apiBaseUrl}/api/public/announcements/${announcement._id}/file`;
  };

  const latestImageUrl = latestAnnouncement ? getAnnouncementImageUrl(latestAnnouncement) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navbar */}
      <nav className="sticky top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg border-b border-blue-100/50 z-50 transition-all duration-300">
        {/* Animated gradient border */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30"></div>
        
        {/* Active section indicator */}
        <motion.div 
          className="absolute bottom-0 h-1 bg-gradient-to-r from-blue-600 to-blue-800 hidden lg:block"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width
          }}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 relative">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo and Title */}
            <motion.div 
              className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-1 min-w-0 pr-4 group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Barangay Logo" 
                  className="h-8 w-8 sm:h-10 sm:w-10 lg:h-14 lg:w-14 object-contain relative z-10"
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs sm:text-sm lg:text-xl font-bold text-black hover:text-blue-600 transition-all duration-300 truncate leading-tight">
                  La Torre North, Bayombong, N.V.
                </span>
                <span className="text-[10px] sm:text-xs lg:text-xs text-black hover:text-blue-600 font-medium tracking-wide hidden sm:block truncate transition-all duration-300">Barangay Management Information System</span>
                <span className="text-[9px] text-black hover:text-blue-600 font-medium tracking-wide sm:hidden truncate transition-all duration-300">BMIS</span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2 xl:space-x-6 flex-shrink-0">
              <div className="flex items-center gap-1 xl:gap-2">
                {[ 
                  { label: 'Home', id: 'home' },
                  { label: 'Announcement', id: 'features' },
                  { label: 'Services', id: 'services' },
                  { label: 'About', id: 'about' },
                  { label: 'Contact', id: 'contact' }
                ].map((item) => (
                  <button
                    key={item.id}
                    ref={navItemRefs[item.id]}
                    className={`relative font-semibold tracking-wide transition-all duration-300 px-2 xl:px-4 py-2 rounded-lg group text-sm xl:text-base ${
                      activeSection === item.id 
                        ? 'text-blue-800' 
                        : 'text-blue-700 hover:text-blue-900'
                    }`}
                    onClick={() => {
                      setActiveSection(item.id);
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <span className="relative z-10">{item.label}</span>
                    <div className="absolute inset-0 bg-blue-50 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300 origin-center"></div>
                  </button>
                ))}
                <motion.button
                  onClick={() => navigate('/login')}
                  className="relative ml-2 xl:ml-6 px-4 xl:px-6 py-2 xl:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden group text-sm xl:text-base"
                  style={{ color: 'white' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10" style={{ color: 'white' }}>Login</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                </motion.button>
              </div>
            </div>

            {/* Tablet Navigation */}
            <div className="hidden md:flex lg:hidden items-center space-x-2">
              <motion.button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg text-sm"
                style={{ color: 'white' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Login
              </motion.button>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-300"
                whileTap={{ scale: 0.95 }}
                data-mobile-menu="toggle"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
              >
                <motion.div
                  animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </motion.div>
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-300"
                whileTap={{ scale: 0.95 }}
                data-mobile-menu="toggle"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
              >
                <motion.div
                  animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </motion.div>
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div 
                className="lg:hidden absolute top-full left-0 right-0 bg-white/98 backdrop-blur-md shadow-xl border-b border-blue-100/50 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto w-full"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                data-mobile-menu="container"
                role="navigation"
                aria-label="Mobile navigation menu"
              >
                <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-2">
                  {[
                    { label: 'Home', id: 'home' },
                    { label: 'Announcement', id: 'features' },
                    { label: 'Services', id: 'services' },
                    { label: 'About', id: 'about' },
                    { label: 'Contact', id: 'contact' }
                  ].map((item, index) => (
                    <motion.button
                      key={item.id}
                      className={`relative block w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base ${
                        activeSection === item.id
                          ? 'text-blue-800 bg-blue-50'
                          : 'text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                      }`}
                      onClick={() => {
                        setActiveSection(item.id);
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setMobileMenuOpen(false);
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className="relative z-10">{item.label}</span>
                      {activeSection === item.id && (
                        <motion.div 
                          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-blue-800 rounded-r"
                          layoutId="activeMobileIndicator"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  ))}
                  <motion.div
                    className="lg:hidden pt-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <motion.button
                      onClick={() => {
                        navigate('/login');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg text-sm sm:text-base"
                      style={{ color: 'white' }}
                    >
                      Login
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="flex items-center justify-center min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] px-4 sm:px-6 lg:px-8 relative py-10 md:py-12 overflow-hidden"
      >
        <div className="absolute inset-0 z-0 overflow-hidden">
          {heroSlides.map((src, idx) => (
            <img
              key={`${src}-${idx}`}
              src={src}
              alt="Barangay slideshow"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${idx === currentHeroSlide ? 'opacity-100' : 'opacity-0'}`}
              draggable={false}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-blue/70 to-black/60 pointer-events-none" />
        </div>

        {/* Animated Background Elements - positioned safely within viewport */}
        <motion.div 
          className="absolute top-20 left-4 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 z-0"
          animate={{ 
            x: [0, 50, 0],
            y: [0, -25, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-4 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 z-0"
          animate={{ 
            x: [0, -50, 0],
            y: [0, 25, 0],
          }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <div className="max-w-3xl w-full mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center justify-center w-full"
          >
            
            <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl font-bold text-white leading-tight mb-4 text-center px-4">
              Welcome to <br /> <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-blue-400 font-bold transition-all duration-300">La Torre North</span>
              <span className="block text-base sm:text-lg md:text-xl text-gray-200 mt-2">
                Bayombong, Nueva Vizcaya
              </span>
            </h1>
           
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full px-4 max-w-md sm:max-w-lg mx-auto">
              <motion.button
                onClick={() => navigate('/login')}
                className="group px-6 sm:px-8 py-3 sm:py-4 bg-black text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-black/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto border border-white/10"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-white   ">Get Started</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-white" />
              </motion.button>
              <motion.button
                onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-black border border-black rounded-lg font-semibold text-base sm:text-lg hover:bg-gray-100 transition-all w-full sm:w-auto"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
          <div className="flex flex-col lg:flex-row justify-center items-center gap-8 lg:gap-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 sm:gap-6 text-white max-w-sm w-full"
              >
                <div className="flex-shrink-0 bg-white/20 p-4 sm:p-6 rounded-xl">
                  {benefit.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg sm:text-xl mb-1 sm:mb-2">{benefit.title}</h3>
                  <p className="text-blue-100 text-sm sm:text-base leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements Section */}
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
              Community Announcements
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay informed about the latest advisories, activities, and reminders from the barangay hall.
            </p>
          </motion.div>

          {announcementsLoading ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="space-y-4">
                {[0, 1, 2].map((skeleton) => (
                  <div key={skeleton} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          ) : announcementsError ? (
            <div className="text-center text-red-600 font-semibold">
              {announcementsError}
            </div>
          ) : latestAnnouncement ? (
            <div className={`flex flex-col gap-8 ${hasPreviousAnnouncements ? 'lg:flex-row' : 'items-center'}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={latestAnnouncement?._id || `featured-${selectedAnnouncementIndex}`}
                  className={`w-full ${hasPreviousAnnouncements ? 'lg:w-2/3' : 'lg:w-3/4'}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <SpotlightCard
                    className="p-6 lg:p-10 shadow-xl hover:shadow-2xl transition-all h-full"
                    spotlightColor="rgba(59, 130, 246, 0.1)"
                    borderColor="rgba(59, 130, 246, 0.25)"
                  >
                    {latestImageUrl && (
                      <motion.div
                        className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50"
                        initial={{ opacity: 0.8, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <img
                          src={latestImageUrl}
                          alt={`Announcement ${latestAnnouncement.title}`}
                          className="w-full h-64 object-cover"
                          loading="lazy"
                        />
                      </motion.div>
                    )}
                    <div className="flex items-center gap-3 text-blue-600 uppercase tracking-widest text-xs font-semibold mb-4">
                      <Megaphone className="w-5 h-5" />
                      Latest Announcement
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {latestAnnouncement.title}
                    </h3>
                    <p className="text-gray-600 text-base md:text-lg leading-relaxed">
                      {latestAnnouncement.description || 'No description provided.'}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatAnnouncementDate(latestAnnouncement.createdAt)}</span>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs uppercase tracking-wide">
                        {latestAnnouncement.category || 'Announcement'}
                      </span>
                    </div>
                  </SpotlightCard>
                </motion.div>
              </AnimatePresence>

              {hasPreviousAnnouncements && (
                <motion.div
                  className="w-full lg:w-1/3 space-y-4"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  {previousAnnouncements.map(({ item: announcement, index: originalIndex }) => {
                    const previewImageUrl = getAnnouncementImageUrl(announcement);
                    return (
                      <SpotlightCard
                        key={announcement._id || `announcement-${originalIndex}`}
                        className="p-5 shadow-md hover:shadow-lg transition-all h-48 flex flex-col justify-between gap-2 cursor-pointer"
                        spotlightColor="rgba(59, 130, 246, 0.08)"
                        borderColor="rgba(59, 130, 246, 0.15)"
                        onClick={() => setSelectedAnnouncementIndex(originalIndex)}
                      >
                        {previewImageUrl && (
                          <div className="mb-3 overflow-hidden rounded-xl border border-blue-50 bg-blue-50/30 h-24">
                            <img
                              src={previewImageUrl}
                              alt={`Announcement ${announcement.title}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 leading-snug">
                              {announcement.title}
                            </h4>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {dayjs(announcement.createdAt).format('MMM D')}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-gray-600 leading-relaxed overflow-hidden text-ellipsis">
                          {truncateText(announcement.description, 140)}
                        </p>
                      </SpotlightCard>
                    );
                  })}
                </motion.div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-600 text-lg">
              No announcements have been posted yet. Please check back soon.
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Available Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Quick and efficient processing of all your barangay document needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <SpotlightCard 
                  className="h-full"
                  spotlightColor="rgba(59, 130, 246, 0.06)"
                  borderColor="rgba(59, 130, 246, 0.15)"
                >
                  <div className="p-8 flex flex-col h-full group cursor-pointer">
                    <div className="mb-5 p-4 bg-blue-50 rounded-xl text-blue-600 w-fit">
                      {service.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-5 leading-relaxed flex-grow">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 pt-3 border-t border-gray-100">
                      <Clock className="w-4 h-4" />
                      <span>{service.time}</span>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-white">Request a Service</span>
              <ChevronRight className="w-5 h-5 text-white" />
            </motion.button>
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
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative">
        <motion.div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '30px 30px']
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
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
                  className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full mb-3 sm:mb-4"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  {stat.icon}
                </motion.div>
                <motion.div
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  {stat.number}
                </motion.div>
                <div className="text-blue-100 text-base sm:text-lg">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
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
              className="relative order-1 lg:order-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Award className="w-8 h-8 mb-4" />
                  <div className="text-3xl font-bold mb-2">95%</div>
                  <div className="text-purple-100">Satisfaction</div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { step: "1", title: "Create Account", description: "Sign up and verify your identity", icon: <Users className="w-6 h-6 sm:w-8 sm:h-8" /> },
              { step: "2", title: "Submit Request", description: "Select the document you need", icon: <FileText className="w-6 h-6 sm:w-8 sm:h-8" /> },
              { step: "3", title: "Pay at Barangay", description: "Visit the office for payment", icon: <MapPin className="w-6 h-6 sm:w-8 sm:h-8" /> },
              { step: "4", title: "Receive Document", description: "Get notified when ready", icon: <Bell className="w-6 h-6 sm:w-8 sm:h-8" /> }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-all h-full flex flex-col">
                  <motion.div
                    className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-xl sm:text-2xl font-bold"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {item.step}
                  </motion.div>
                  <div className="text-blue-600 mb-3 sm:mb-4 flex justify-center">
                    {item.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600 flex-grow">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400" />
                  </div>
                )}
                {/* Mobile arrow for flow */}
                {index < 3 && (
                  <div className="lg:hidden flex justify-center mt-2 mb-2">
                    <motion.div
                      className="w-5 h-5 text-blue-400 transform rotate-90"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <ChevronRight />
                    </motion.div>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6 order-2 lg:order-1"
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
                      <p className="text-gray-500 text-sm mt-1">Closed on Saturdays, Sundays and Holidays</p>
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
                  className="w-full px-6 py-3 bg-white rounded-lg font-semibold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-blue-900">Access Online Services</span>
                  <ChevronRight className="w-5 h-5 text-blue-900" />
                </button>
              </motion.div>
            </motion.div>

            {/* Map Section */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6 order-1 lg:order-2"
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-blue-800">
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                    Our Location
                  </h3>
                </div>
                <div className="relative w-full h-64 sm:h-80 lg:h-96 bg-gray-100">
                  <iframe
                    src="https://www.openstreetmap.org/export/embed.html?bbox=121.1361234669432%2C16.49564131499667%2C121.1401234669432%2C16.49964131499667&layer=mapnik&marker=16.49764131499667%2C121.1381234669432"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    title="La Torre North Barangay Location"
                    className="w-full h-full"
                  />
                  <div className="mt-2 text-center">
                    <a
                      href="https://www.openstreetmap.org/?mlat=16.49764131499667&mlon=121.1381234669432#map=16/16.49764131499667/121.1381234669432"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                    </a>
                  </div>
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
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative">
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
            backgroundSize: '30px 30px',
            backgroundPosition: '0 0, 15px 15px'
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <motion.button
                onClick={() => navigate('/login')}
                className="px-8 sm:px-10 py-3 sm:py-4 bg-white rounded-lg font-bold text-base sm:text-lg hover:bg-blue-50 transition-all shadow-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-blue-600">Create Account Now</span>
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </motion.button>
              <motion.button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 sm:px-10 py-3 sm:py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-base sm:text-lg hover:bg-white/10 transition-all w-full sm:w-auto"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img 
                  src="logo.png" 
                  alt="Barangay Logo" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-base sm:text-lg">La Torre North</div>
                  <div className="text-xs sm:text-sm text-gray-400">Bayombong, Nueva Vizcaya</div>
                </div>
              </div>
              <p className="text-gray-400 mb-4 text-sm sm:text-base max-w-md">
                Empowering our community through modern technology and transparent governance. 
                Building a better tomorrow, today.
              </p>
              <div className="flex gap-3 sm:gap-4">
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
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
                {['Barangay Clearance', 'Certificates', 'Payments', 'Complaints'].map((service, index) => (
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
          <div className="border-t border-gray-800 pt-6 sm:pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-xs sm:text-sm text-center md:text-left">
                © 2025 La Torre North Barangay. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            onClick={() => {
              setActiveSection('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer"
            style={{ zIndex: 9999 }}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ 
              opacity: 1,
              scale: 1,
              y: 0
            }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3 }}
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
