import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FacilityPortal from './components/FacilityPortal';
import RegisterFacility from './components/RegisterFacility';

function App() {
  return (
    <Router>
      <Routes>
        {/* Login is the first page */}
        <Route path="/" element={<Login />} />
        
        {/* Dashboard is protected (kinda) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/facility" element={<FacilityPortal />} />
        <Route path="/register-facility" element={<RegisterFacility />} />
      </Routes>
    </Router>
  );
}

export default App;