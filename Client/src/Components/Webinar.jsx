import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import webinar_img from "../assets/Img/webinar_img.jpg"
import  "../Components/StyleSheets/Webinar.css"
const Webinars = () => {
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWebinar, setSelectedWebinar] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        console.log('Fetching webinars...');
        const response = await axios.get(`${API_URL}/api/getwebinar`);
        console.log('Webinars fetched:', response.data);
        
        // Only keep the last 5 webinars
        const lastFiveWebinars = response.data.slice(-5);
        setWebinars(lastFiveWebinars);
      } catch (error) {
        console.error('Error fetching webinars:', error);
        setError('Error fetching webinars.');
      } finally {
        setLoading(false);
      }
    };
    fetchWebinars();
  }, []);

  const handleEnroll = async (webinar) => {
    console.log('Handling enroll for webinar:', webinar);
    setSelectedWebinar(webinar);

    try {
      // Check if the user has already paid for the webinar
      const paymentCheckResponse = await axios.post(`${API_URL}/api/checkEnrollmentStatus`, {
        webinarId: webinar._id,
      },{
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Payment status:', paymentCheckResponse.data);
      if (paymentCheckResponse.data.alreadyPaid) {
        console.log('User has already paid for this webinar. Redirecting to webinar details...');
        navigate(`/webinarinfo/${webinar._id}`);
      } else {
        if (webinar.price === "0") {
          console.log('Webinar is free. Navigating to webinar details page...');
          navigate(`/webinarinfo/${webinar._id}`);
        } else {
          console.log('Webinar is paid. Initiating payment...');
          initiatePayment(webinar);
        }
      }
    } catch (error) {
      if(!token){
        navigate('/login')
      } 
      else{
        alert('Error checking payment status. Please try again.');
      }
    }
  };

  const initiatePayment = async (webinar) => {
    if (!webinar) {
      console.log('No webinar selected for payment.');
      return;
    }

    try {
      console.log('Creating payment order...');
      const response = await axios.post(`${API_URL}/api/create`, {
        amount: webinar.price,
        receiptId: webinar._id,
      },{
        headers: {
         ' Authorization': `Bearer ${token}`,
        },
      });
      console.log('Order created:', response.data);
      const { orderId: razorpayOrderId } = response.data;

      console.log('Fetching Razorpay key...');
      const keyResponse = await axios.get(`${API_URL}/api/getkey`);
      console.log('Razorpay key fetched:', keyResponse.data);
      const { key } = keyResponse.data;

      const amountInPaise = parseInt(webinar.price, 10) * 100;
      console.log('Amount in paise:', amountInPaise);

      const options = {
        key, // Your Razorpay key ID
        amount: amountInPaise, // Amount in paise
        currency: "INR",
        name: webinar.title,
        description: "Enrollment for Webinar",
        order_id: razorpayOrderId,
        handler: async function (response) {
          console.log('Payment successful:', response);

          // Verify the payment with your backend
          try {
            
            console.log('Verifying payment...');
            const paymentVerificationResponse = await axios.post(
              `${API_URL}/api/confirmpayment`,
              {
                webinarId: webinar._id,
                paymentId: response.razorpay_payment_id,
                orderId: razorpayOrderId,
                signature: response.razorpay_signature,
              },{
                headers: {
                 'Authorization': `Bearer ${token}`,
                },
              }
            );
            console.log('Payment verification response:', paymentVerificationResponse.data);
            if (paymentVerificationResponse.data.success) {
              console.log('Payment verification successful. Navigating to webinar details...');
              setPaymentStatus('Payment successful!');
              navigate(`/webinarinfo/${webinar._id}`);
            } else {
              console.error('Payment verification failed.');
              alert("Payment verification failed. Please try again.");
            }
          } catch (verificationError) {
            console.error('Payment verification error:', verificationError);
            alert("Payment verification failed. Please try again.");
          }
        },
        theme: {
          color: "#F37254",
        },
      };

      console.log('Opening Razorpay payment...');
      const payment = new window.Razorpay(options);
      payment.open();
    } catch (error) {
      console.error('Error initiating payment:', error);
      setPaymentStatus('Error initiating payment.');
    }
  };

  return (
    <> <img src={webinar_img} alt="Webinar Banner" className="webinar_banner" />
    <div className="webinar_outer_container">
      
      <div className="webinar_inner_container">
        
        <h2 className="webinar_h2">Upcoming Webinars</h2>
        {loading ? (
          <p className="webinar_loading">Loading...</p>
        ) : error ? (
          <p className="webinar_error">{error}</p>
        ) : (
          <div className="webinar_grid">
            {webinars.map((webinar) => (
              <div className="webinar_card" key={webinar._id}>
                <h3 className="webinar_title">{webinar.title}</h3>
                <p className="webinar_presenter">Presenter: {webinar.presenter}</p>
                <p className="webinar_date">Date: {new Date(webinar.date).toLocaleDateString()}</p>
                <p className="webinar_price">Price: {webinar.price === "0" ? 'Free' : `₹${webinar.price}`}</p>
                <button className="webinar_enroll_button" onClick={() => handleEnroll(webinar)}>
                  {webinar.price === "0" ? 'Enroll Now' : 'Pay & Enroll'}
                </button>
                {paymentStatus && <p className="webinar_payment_status">{paymentStatus}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
  

  
  
};

export default Webinars;