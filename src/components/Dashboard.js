import React from 'react';
import CreateBooking from './CreateBooking';
import BookingList from './BookingList'; // <--- Import the new component

const Dashboard = () => {
    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-danger">Dispatcher Command Center</h2>
                <button className="btn btn-outline-secondary" onClick={() => window.location.href='/'}>Logout</button>
            </div>
            
            <div className="row">
                <div className="col-md-4">
                    {/* Left Side: Form */}
                    <CreateBooking />
                </div>
                
                <div className="col-md-8">
                    <div className="row">
                        <div className="col-md-12 mb-4">
                            {/* Top Right: Map Placeholder */}
                            <div className="card shadow p-4 bg-light text-center" style={{height: '300px'}}>
                                <h4 className="mt-5 text-muted">Google Maps Integration</h4>
                                <p>Live fleet tracking will be displayed here.</p>
                            </div>
                        </div>
                        
                        <div className="col-md-12">
                            {/* Bottom Right: The Real List */}
                            <BookingList /> 
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;