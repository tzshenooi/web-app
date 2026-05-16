import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import RegisterFacility from './components/RegisterFacility';
import FacilityPortal from './components/FacilityPortal';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register-facility" element={<RegisterFacility />} />
        <Route path="/clinic" element={<FacilityPortal />} />
        <Route path="/facility" element={<Navigate to="/clinic" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
