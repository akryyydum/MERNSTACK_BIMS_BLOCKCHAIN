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
  const [currentGallerySlide, setCurrentGallerySlide] = useState(0);
  const navItemRefs = {
    home: useRef(null),
    features: useRef(null),
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

  const galleryImages = useMemo(() => [
    { src: '/images/FB_IMG_1764781154864.jpg', tall: false },
    { src: '/images/FB_IMG_1764781247001.jpg', tall: true },
    { src: '/images/FB_IMG_1764781262641.jpg', tall: false },
    { src: '/images/FB_IMG_1764781273902.jpg', tall: true },
    { src: '/images/FB_IMG_1764781360955.jpg', tall: false },
    { src: '/images/FB_IMG_1764781400196.jpg', tall: false },
    { src: '/images/FB_IMG_1764781408111.jpg', tall: true },
    { src: '/images/FB_IMG_1764781417485.jpg', tall: false },
    { src: '/images/FB_IMG_1764781437953.jpg', tall: false },
    { src: '/images/FB_IMG_1764781455427.jpg', tall: true },
    { src: '/images/FB_IMG_1764781765038.jpg', tall: false },
    { src: '/images/FB_IMG_1764781774291.jpg', tall: true },
    { src: '/images/FB_IMG_1764781843009.jpg', tall: false },
    { src: '/images/FB_IMG_1764781910250.jpg', tall: false },
    { src: '/images/FB_IMG_1764781932136.jpg', tall: true },
    { src: '/images/FB_IMG_1764781944498.jpg', tall: false }
  ], []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setShowScrollTop(currentScrollY > 300);
      
      // Determine active section based on scroll position
      const sections = ['home', 'features', 'about', 'contact'];
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

  // Auto-advance gallery slideshow on mobile
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGallerySlide((prev) => (prev + 1) % galleryImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [galleryImages.length]);

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
      icon: <Users className="w-8 h-8" />,
      title: "Strong Community",
      description: "A vibrant barangay united by bayanihan spirit and family values"
    },
    {
      icon: <HeartHandshake className="w-8 h-8" />,
      title: "Caring Leadership",
      description: "Dedicated officials committed to transparent and responsive governance"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Safe & Progressive",
      description: "A peaceful community embracing development while preserving heritage"
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
    { number: "2,500+", label: "Barangay Residents", icon: <Users className="w-6 h-6" /> },
    { number: "850+", label: "Registered Households", icon: <MapPin className="w-6 h-6" /> },
    { number: "12", label: "Barangay Officials", icon: <Award className="w-6 h-6" /> }
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
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 text-center px-4">
              Welcome to <br /> <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-blue-400 font-bold transition-all duration-300">La Torre North</span>
              <span className="block text-xl sm:text-2xl md:text-3xl text-gray-200 mt-4">
                Bayombong, Nueva Vizcaya
              </span>
            </h1>
           
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center w-full px-4 max-w-md sm:max-w-2xl mx-auto">
              <motion.button
                onClick={() => navigate('/login')}
                className="group px-8 sm:px-10 py-4 sm:py-5 bg-black text-white rounded-lg font-semibold text-lg sm:text-xl hover:bg-black/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto border border-white/10"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-white">Get Started</span>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform text-white" />
              </motion.button>
              <motion.button
                onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 sm:px-10 py-4 sm:py-5 bg-white text-black border border-black rounded-lg font-semibold text-lg sm:text-xl hover:bg-gray-100 transition-all w-full sm:w-auto"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Learn More
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
              Our Barangay at a Glance
            </h2>
            <p className="text-xl text-blue-100">
              A thriving community serving residents every day
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
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
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

      {/* About Section - Introduction */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              About Barangay La Torre North
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A vibrant and welcoming community in the heart of Bayombong, Nueva Vizcaya
            </p>
          </motion.div>

          {/* Introduction */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Welcome to Our Community
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                Barangay La Torre North is a vibrant and welcoming community nestled in Bayombong, the capital of Nueva Vizcaya. 
                Known for its strong sense of unity, rich cultural traditions, and deep-rooted family values, our barangay embodies 
                the spirit of genuine Filipino hospitality and cooperation.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                Our residents take pride in preserving the warmth and camaraderie that define Filipino communities. From everyday 
                greetings exchanged along our streets to shared meals during community gatherings, the barangay thrives on the 
                principle of "bayanihan" – the spirit of communal unity and cooperation.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Life in La Torre North is characterized by peaceful neighborhoods, where children play safely, families grow together, 
                and neighbors look out for one another. Our community values education, hard work, respect for elders, and active 
                participation in local affairs, creating a nurturing environment where every resident can flourish.
              </p>
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
                  <Users className="w-8 h-8 mb-4" />
                  <div className="text-2xl font-bold mb-2">Strong Unity</div>
                  <div className="text-blue-100">Together as One</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-2xl text-white shadow-lg mt-8"
                >
                  <HeartHandshake className="w-8 h-8 mb-4" />
                  <div className="text-2xl font-bold mb-2">Bayanihan</div>
                  <div className="text-green-100">Spirit of Cooperation</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-purple-500 to-purple-600 p-8 rounded-2xl text-white shadow-lg"
                >
                  <Shield className="w-8 h-8 mb-4" />
                  <div className="text-2xl font-bold mb-2">Safe Haven</div>
                  <div className="text-purple-100">Peaceful Living</div>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-2xl text-white shadow-lg mt-8"
                >
                  <Award className="w-8 h-8 mb-4" />
                  <div className="text-2xl font-bold mb-2">Progressive</div>
                  <div className="text-orange-100">Moving Forward</div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Vision & Mission */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-50 to-white p-8 lg:p-10 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Our Vision</h3>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                Barangay La Torre North is a progressive and self-reliant community with healthy residents who are God-fearing 
                and peace-loving; who participate in local governance to sustain a friendly and wholesome environment.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-green-50 to-white p-8 lg:p-10 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To participate actively in the implementation of programs, projects, and activities of the barangay.
              </p>
            </motion.div>
          </div>

          {/* Goal & Objective - BDRRMC */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-purple-50 to-white p-8 lg:p-10 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Our Goal</h3>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To monitor and evaluate the implementation of the Barangay Disaster Risk Reduction Management and regularly 
                review and test the plan of the local planning programs. And ensure integration of disaster risk reduction and 
                climate change adaptation into local development plans, programs, budgets as a strategy in the reduction of poverty.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-orange-50 to-white p-8 lg:p-10 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Our Objective</h3>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                To recommend the implementation of forced pre-emptive evacuation of affected local residents in times of any 
                disaster or emergencies at the barangay. The BDRRMC serves as the main communication link for all the responding units.
              </p>
            </motion.div>
          </div>

          {/* Physical and Geographical Classification */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-green-50 to-white p-8 lg:p-12 rounded-2xl shadow-lg mb-20"
          >
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Location & Geography</h3>
            
            {/* Land Area Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total Land Area", value: "362.80 hectares", icon: <Globe className="w-6 h-6" />, color: "blue" },
                { label: "Agricultural", value: "99.3 hectares", icon: <TrendingUp className="w-6 h-6" />, color: "green" },
                { label: "Residential", value: "107.10 hectares", icon: <Users className="w-6 h-6" />, color: "purple" },
                { label: "Timberland", value: "255.7 hectares", icon: <Globe className="w-6 h-6" />, color: "orange" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-${stat.color}-50 p-6 rounded-xl text-center shadow-md hover:shadow-lg transition-all`}
                >
                  <div className={`w-12 h-12 bg-${stat.color}-600 rounded-full flex items-center justify-center mx-auto mb-3 text-white`}>
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Location Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Location</h4>
                    <p className="text-gray-700 leading-relaxed">
                      Located in the northern part of Bayombong, Nueva Vizcaya, our barangay is approximately 
                      <span className="font-semibold"> 2.5 kilometers</span> from the municipal hall, taking about 
                      <span className="font-semibold"> 10 minutes</span> to reach the barangay hall.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Accessibility</h4>
                    <p className="text-gray-700 leading-relaxed">
                      The barangay is easily accessible by tricycle or any vehicle, making it convenient for residents 
                      and visitors to travel to and from the community.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl shadow-md"
              >
                <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  Barangay Boundaries
                </h4>
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="font-semibold text-blue-600 min-w-[80px]">North:</span>
                    <span>Barangay Casat</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-green-600 min-w-[80px]">East:</span>
                    <span>Barangay Luyang</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <span className="font-semibold text-purple-600 min-w-[80px]">West:</span>
                    <span>Barangay Masoc</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <span className="font-semibold text-orange-600 min-w-[80px]">South:</span>
                    <span>Barangay La Torre South</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* History */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-50 to-white p-8 lg:p-12 rounded-2xl shadow-lg mb-20"
          >
            <h3 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our History</h3>
            <div className="max-w-4xl mx-auto space-y-6 text-lg text-gray-700 leading-relaxed text-justify">
              <p>
                The landscape of our barangay is marked by the lush greenery of the Matuno mountain range, where large plant growth 
                with their verdant tones creates a picturesque natural setting. Unlike areas with Spanish colonial architecture dominated 
                by towering spires, our community's character is defined by its connection to the natural beauty surrounding it.
              </p>
              <p>
                This barangay was created during the mid-year of <span className="font-semibold">1868</span> during the term of 
                Governadorcillo (Mayor) <span className="font-semibold">Jacinto Bacani</span> of Bayombong. Originally, the area was 
                known as <span className="font-semibold">"PIDDIG"</span>, a name given by the intrepid first Ilocano immigrants from 
                Piddig, Ilocos Norte who inhabited the place. These pioneering settlers chose this name to conserve the memory of their 
                birthplace, honoring the homeland they left behind as they built a new life in Nueva Vizcaya.
              </p>
              <p>
                The early years saw changes in leadership as Bacani was replaced by <span className="font-semibold">Clemente Cutaran</span> who 
                served as Governadorcillo of Bayombong during <span className="font-semibold">1870-1871</span>. However, Bacani returned to 
                office in <span className="font-semibold">1872-1873</span>, marking his second term as Chief Executive of the town.
              </p>
              <p>
                It was during Bacani's second term that a significant transformation occurred. The settlement's name was changed from 
                Piddig to <span className="font-semibold">LA TORRE</span> in honor of the newly appointed Spanish Provincial Governor of 
                Nueva Vizcaya, <span className="font-semibold">Ramon dela Torre</span>. This renaming reflected the political realities 
                of the Spanish colonial period and established the identity that would endure through the generations.
              </p>
              <p>
                The spirit of those intrepid Ilocano pioneers continues to inspire our community today. Their courage in leaving their 
                homeland to establish a new settlement, their dedication to preserving their cultural identity, and their determination 
                to build a thriving community have become the foundation upon which modern La Torre North stands. Their legacy reminds 
                us that our barangay was built on the values of bravery, hard work, and the enduring connection between past and present.
              </p>
              <p>
                Today, Barangay La Torre North honors both its indigenous roots as Piddig and its historical evolution under Spanish 
                colonial influence. We take pride in our rich heritage, carrying forward the traditions of our Ilocano ancestors while 
                embracing progress and development for future generations.
              </p>
            </div>
          </motion.div>

          {/* Barangay Organizational Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Barangay Officials</h3>
            
            {/* Punong Barangay */}
            <div className="mb-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-blue-600 mb-1">Punong Barangay</div>
                    <div className="text-xl font-bold text-gray-900">KGG. AMANTE M. PALLAYA</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Kagawads */}
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Sangguniang Barangay Members</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  "KGG. JOEL C. CASTRICIONES",
                  "KGG. EMILIO V. CALAMUG JR.",
                  "KGG. MELITA P. SANCHEZ",
                  "KGG. VILLAFUERTE T. MARTINEZ, JR.",
                  "KGG. MILAGROS P. PADILLA",
                  "KGG. VIRGINIA A. PABUNAN",
                  "KGG. ORLANDO M. PALLAYA"
                ].map((name, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-blue-600 mb-1">Kagawad</div>
                        <div className="text-base font-bold text-gray-900">{name}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* SK Chairman and Staff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SK Chairman */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-green-600 mb-1">SK Chairman</div>
                    <div className="text-base font-bold text-gray-900">KGG. ADRIAN PAUL B. PALLAYA</div>
                  </div>
                </div>
              </motion.div>

              {/* Secretary */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 text-purple-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-purple-600 mb-1">Secretary</div>
                    <div className="text-base font-bold text-gray-900">KGG. MARIETTA B. LAS-ANG</div>
                  </div>
                </div>
              </motion.div>

              {/* Treasurer */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 text-orange-600">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-orange-600 mb-1">Treasurer</div>
                    <div className="text-base font-bold text-gray-900">KGG. MANNY P. DUMELOD</div>
                  </div>
                </div>
              </motion.div>

              {/* Admin Assistant */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-gray-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-600 mb-1">Admin. Assistant</div>
                    <div className="text-base font-bold text-gray-900">KGG. VERONICA A. ALCANTARA</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Community Values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {[
              {
                icon: <HeartHandshake className="w-8 h-8" />,
                title: "Unity & Cooperation",
                description: "Working together for the common good through bayanihan spirit"
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Family Values",
                description: "Strong family ties and respect for elders are our foundation"
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Peace & Safety",
                description: "A safe environment where children can grow and families flourish"
              },
              {
                icon: <Award className="w-8 h-8" />,
                title: "Progress & Development",
                description: "Embracing positive change while preserving our cultural heritage"
              }
            ].map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  {value.icon}
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h4>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Community Programs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Community Programs & Initiatives</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Youth Development Programs",
                  description: "Sports leagues, skills training, scholarship assistance, and leadership seminars to empower our young people",
                  icon: <Users className="w-6 h-6" />
                },
                {
                  title: "Senior Citizens Support",
                  description: "Monthly social pension assistance, health check-ups, recreational activities, and special programs honoring our elders",
                  icon: <HeartHandshake className="w-6 h-6" />
                },
                {
                  title: "Health & Wellness",
                  description: "Regular health check-ups, vaccination drives, maternal and child health programs, and health education campaigns",
                  icon: <Shield className="w-6 h-6" />
                },
                {
                  title: "Environmental Programs",
                  description: "Clean-up drives, tree planting activities, waste segregation initiatives, and campaigns for a greener barangay",
                  icon: <Globe className="w-6 h-6" />
                },
                {
                  title: "Livelihood & Skills Training",
                  description: "Workshops on entrepreneurship, skills development, cooperative formation, and income-generating projects",
                  icon: <TrendingUp className="w-6 h-6" />
                },
                {
                  title: "Public Safety & Security",
                  description: "Barangay tanod patrols, disaster preparedness training, crime prevention programs, and emergency response coordination",
                  icon: <Shield className="w-6 h-6" />
                }
              ].map((program, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                      {program.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{program.title}</h4>
                      <p className="text-gray-600 leading-relaxed">{program.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Gallery - Masonry Layout */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Community Gallery
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Glimpses of life, events, and vibrant moments in Barangay La Torre North
            </p>
          </motion.div>

          {/* Mobile Slideshow */}
          <div className="block sm:hidden relative">
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentGallerySlide}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img
                    src={galleryImages[currentGallerySlide].src}
                    alt={`Barangay La Torre North community moment ${currentGallerySlide + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <p className="text-white text-lg font-medium">
                        Community Life #{currentGallerySlide + 1}
                      </p>
                      <p className="text-white/80 text-sm mt-1">
                        {currentGallerySlide + 1} / {galleryImages.length}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <button
                onClick={() => setCurrentGallerySlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                aria-label="Previous image"
              >
                <ChevronRight className="w-6 h-6 text-gray-800 rotate-180" />
              </button>
              <button
                onClick={() => setCurrentGallerySlide((prev) => (prev + 1) % galleryImages.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-gray-800" />
              </button>

              {/* Dot Indicators */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {galleryImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentGallerySlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentGallerySlide
                        ? 'bg-white w-8'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Desktop/Tablet Masonry Grid */}
          <div className="hidden sm:block">
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {galleryImages.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className={`break-inside-avoid mb-4 ${image.tall ? 'h-auto' : ''}`}
                >
                  <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 group">
                    <img
                      src={image.src}
                      alt={`Barangay La Torre North community moment ${index + 1}`}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-sm font-medium">
                          Community Life #{index + 1}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
              Need a Document?
            </h2>
            <p className="text-xl text-gray-600">
              Request your barangay documents in just a few simple steps
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
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
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

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <motion.button
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <span className="text-white">Request Document Now</span>
              <ChevronRight className="w-5 h-5 text-white" />
            </motion.button>
            <p className="text-gray-600 mt-4 text-sm">
              Already have an account? <button onClick={() => navigate('/login')} className="text-blue-600 hover:text-blue-700 font-semibold">Sign in here</button>
            </p>
          </motion.div>
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
                      <p className="text-gray-600">0927 570 6819</p>
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
                      <p className="text-gray-600">barangaylatorrenorthnuevvizcay@gmail.com</p>
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
                  For urgent matters, you can visit our office during business hours or access our online services.
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
              Be Part of La Torre North's Digital Future
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join our progressive community where technology meets traditional Filipino values. 
              Experience seamless barangay services powered by innovation, transparency, and the spirit of bayanihan.
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
              <p className="text-gray-400 text-sm sm:text-base max-w-md">
                Empowering our community through modern technology and transparent governance. 
                Building a better tomorrow, today.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {['Home', 'Announcement', 'About', 'Contact'].map((link, index) => (
                  <li key={index}>
                    <a 
                      href={`#${link === 'Announcement' ? 'features' : link.toLowerCase()}`}
                      className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-bold text-lg mb-4">Contact Us</h3>
              <ul className="space-y-2">
                <li className="text-gray-400 text-sm">
                  <span className="block font-semibold text-white mb-1">Address</span>
                  La Torre North, Bayombong, Nueva Vizcaya
                </li>
                <li className="text-gray-400 text-sm">
                  <span className="block font-semibold text-white mb-1">Office Hours</span>
                  Monday - Friday: 8:00 AM - 5:00 PM
                </li>
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
