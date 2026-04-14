// import React, { useState } from 'react';
// import { supabase } from '../supabaseClient';

// const AddDriver = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [name, setName] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleRegisterDriver = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     // STEP 1: Create the User in Supabase Auth
//     // This is what allows them to actually log in with email/password
//     const { data, error: authError } = await supabase.auth.signUp({
//       email: email,
//       password: password,
//     });

//     if (authError) {
//       alert("Registration Failed: " + authError.message);
//       setLoading(false);
//       return;
//     }

//     // STEP 2: Link the Auth User to your 'drivers' data table
//     if (data.user) {
//       const { error: dbError } = await supabase
//         .from('drivers')
//         .insert([
//           { 
//             id: data.user.id, // CRITICAL: This links the Login ID to the Driver Record
//             name: name, 
//             email: email, 
//             status: 'Available',
//             current_lat: 5.3544, // Default USM Penang coordinates
//             current_lng: 100.3012 
//           }
//         ]);

//       if (dbError) {
//         alert("Account created, but database record failed: " + dbError.message);
//       } else {
//         alert("✅ Driver Registered! They can now log in to the mobile app.");
//         // Clear fields after success
//         setEmail('');
//         setPassword('');
//         setName('');
//       }
//     }
//     setLoading(false);
//   };

//   return (
//     <div className="add-driver-container">
//       <h2 style={{ color: '#c0392b', marginBottom: '15px' }}>Fleet Management</h2>
//       <p style={{ fontSize: '14px', color: '#666' }}>Register a new ambulance driver to the system.</p>
      
//       <form onSubmit={handleRegisterDriver}>
//         <div className="form-group">
//           <label>Driver Full Name</label>
//           <input 
//             type="text" 
//             placeholder="e.g. Ahmad bin Ali"
//             value={name} 
//             onChange={(e) => setName(e.target.value)} 
//             required 
//           />
//         </div>

//         <div className="form-group">
//           <label>Email Address</label>
//           <input 
//             type="email" 
//             placeholder="driver@ambulance.com"
//             value={email} 
//             onChange={(e) => setEmail(e.target.value)} 
//             required 
//           />
//         </div>

//         <div className="form-group">
//           <label>Password</label>
//           <input 
//             type="password" 
//             placeholder="Min 6 characters"
//             value={password} 
//             onChange={(e) => setPassword(e.target.value)} 
//             required 
//           />
//         </div>

//         <button 
//           type="submit" 
//           className="btn-primary" 
//           style={{ backgroundColor: '#2c3e50', width: '100%' }}
//           disabled={loading}
//         >
//           {loading ? "Registering..." : "Add New Driver"}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default AddDriver;

import React, { useState } from 'react';
import { supabaseAdmin } from '../supabaseClient';

const AddDriver = ({ onComplete }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterDriver = async (e) => {
    e.preventDefault();
    setLoading(true);
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
      });

      if (authError) {
        const msg = authError.message || '';
        alert(
          /already|registered|exists/i.test(msg)
            ? 'This email is already registered.'
            : 'Registration failed: ' + msg
        );
        return;
      }

      const user = authData?.user;
      if (!user?.id) {
        alert('Registration failed: no user returned.');
        return;
      }

      const { error: dbError } = await supabaseAdmin.from('drivers').insert({
        id: user.id,
        name: trimmedName,
        email: trimmedEmail,
        status: 'Offline',
        current_lat: 5.3544,
        current_lng: 100.3012,
      });

      if (dbError) {
        console.error('Driver DB insert:', dbError);
        alert('Auth user was created, but the driver record failed: ' + dbError.message);
        return;
      }

      setEmail('');
      setPassword('');
      setName('');
      if (onComplete) {
        onComplete();
      } else {
        alert('Driver registered. They can sign in on the mobile app with this email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-driver-container" style={{ padding: '10px' }}>
      <form onSubmit={handleRegisterDriver}>
        <div className="input-group">
          <label className="field-label">DRIVER FULL NAME</label>
          <input type="text" className="modern-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Ahmad bin Ali" />
        </div>

        <div className="input-group">
          <label className="field-label">EMAIL ADDRESS</label>
          <input type="email" className="modern-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="driver@ambulance.com" />
        </div>

        <div className="input-group">
          <label className="field-label">PASSWORD (MIN 6 CHARS)</label>
          <input type="password" className="modern-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••" />
        </div>

        <button type="submit" className="confirm-btn" style={{ background: '#2c3e50' }} disabled={loading}>
          {loading ? "REGISTERING..." : "ADD NEW UNIT"}
        </button>
      </form>
    </div>
  );
};

export default AddDriver;