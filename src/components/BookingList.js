import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BookingList = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = async () => {
        try {
            const response = await axios.get('http://localhost:5000/bookings');
            if (response.data.status === 'success') {
                setBookings(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    // NEW: Function to handle the assignment
    const handleAssign = async (bookingId) => {
        // For now, we will manually type the Driver ID (e.g., '1')
        // In the future, we can replace this with a dropdown menu of available drivers
        const driverId = prompt("Enter Driver ID to assign (Default Test Driver is 1):", "1");
        
        if (driverId) {
            try {
                const response = await axios.post('http://localhost:5000/assign_booking', {
                    booking_id: bookingId,
                    driver_id: driverId
                });
                
                if (response.data.status === 'success') {
                    alert("Booking Assigned!");
                    fetchBookings(); // Refresh the list to show the new status
                }
            } catch (error) {
                alert("Failed to assign driver.");
                console.error(error);
            }
        }
    };

    useEffect(() => {
        fetchBookings();
        const interval = setInterval(fetchBookings, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <p>Loading incidents...</p>;

    return (
        <div className="card shadow p-3" style={{height: '100%', overflowY: 'auto'}}>
            <h4 className="text-dark mb-3">Active Incidents</h4>
            
            {bookings.length === 0 ? (
                <p className="text-muted">No active bookings.</p>
            ) : (
                <div className="list-group">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="list-group-item list-group-item-action flex-column align-items-start">
                            <div className="d-flex w-100 justify-content-between">
                                <h5 className="mb-1 text-danger">{booking.emergency_type}</h5>
                                <small className="text-muted">ID: {booking.id}</small>
                            </div>
                            <p className="mb-1"><strong>Patient:</strong> {booking.patient_name}</p>
                            <p className="mb-1"><strong>Loc:</strong> {booking.location}</p>
                            
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className={`badge ${booking.status === 'Pending' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                    {booking.status}
                                </span>
                                
                                {/* Only show Assign button if status is Pending */}
                                {booking.status === 'Pending' && (
                                    <button 
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleAssign(booking.id)}
                                    >
                                        Assign Driver
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BookingList;