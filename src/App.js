import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FacilityPortal from './components/FacilityPortal';

function App() {
  return (
    <Router>
      <Routes>
        {/* Login is the first page */}
        <Route path="/" element={<Login />} />
        
        {/* Dashboard is protected (kinda) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/facility" element={<FacilityPortal />} />
      </Routes>
    </Router>
  );
}

export default App;