import React, { useState, useEffect, useRef } from 'react'; 
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase-config';
import { db, storage } from '../firebase/firebase-config'; // Ensure db is imported
import { collection, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Dashboard.css';

const DashboardPage = () => {
  const [totalItems, setTotalItems] = useState(0);
  const [categoryItemCounts, setCategoryItemCounts] = useState({ nonAcademic: 0, academic: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [totalApprovedRequests, setTotalApprovedRequests] = useState(0); // Track total approved requests
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileImage, setProfileImage] = useState('userdashboard.png'); // Default profile image
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const userName = "Admin";

  useEffect(() => {
    // Fetch total items and group by category (Non Academic, Academic)
    const itemsCollection = collection(db, 'items');
    const unsubscribeItems = onSnapshot(itemsCollection, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data());
      setTotalItems(items.length);

      const categoryMap = { nonAcademic: 0, academic: 0 };

      items.forEach(item => {
        if (item.category === "Non Academic") {
          categoryMap.nonAcademic += 1;
        } else if (item.category === "Academic") {
          categoryMap.academic += 1;
        }
      });

      setCategoryItemCounts(categoryMap);
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    // Fetch approved requests
    const requestsCollection = collection(db, 'requests');
    const unsubscribeRequests = onSnapshot(requestsCollection, (snapshot) => {
      const totalApproved = snapshot.docs.filter(doc => doc.data().approved).length;
      setTotalApprovedRequests(totalApproved); // Set total approved requests
    }, (error) => {
      setError(error.message);
    });

    return () => {
      unsubscribeItems();
      unsubscribeRequests();
    };
  }, []);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/sign-in');
    } catch (error) {
      console.error('Error logging out: ', error);
    }
  };

  const handleImageClick = () => {
    // Trigger file input when the image is clicked
    fileInputRef.current.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const storageRef = ref(storage, `profile-images/${file.name}`);
      uploadBytes(storageRef, file)
        .then(() => getDownloadURL(storageRef))
        .then((url) => {
          setProfileImage(url); // Set the new profile image
        })
        .catch((error) => {
          console.error("Error uploading profile image:", error);
        });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <div className="search-and-profile">
          <input
            type="text"
            placeholder="Search categories..."
            className="search-input"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <div className="profile">
            {/* Profile Image that can be clicked to change */}
            <img
              src={profileImage}
              alt="Profile Icon"
              className="profile-icon"
              onClick={handleImageClick}
              style={{ cursor: 'pointer' }}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <span className="user-name">{userName}</span>
            <button className="dropdown-toggle" onClick={toggleDropdown}>
              &#9662;
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <Link to="/settings">Account Settings</Link>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="cards">
          <div className="card item-card">
            <Link to="/manage-item" className="ditems">
              <h3>ITEMS</h3>
              <p>Total Items: {totalItems}</p>
            </Link>
          </div>

          {/* Non Academic Folder */}
          <div className="card folder-card">
            <Link to="/manage-item" className="link">
              <h3>Non Academic</h3>
            </Link>
            <div className="folder-list">
              <h4 onClick={() => handleCategoryClick('Non Academic')}>Non Academic</h4>
              {selectedCategory === 'Non Academic' && (
                <ul className="item-list">
                  <li>Total Items: {categoryItemCounts.nonAcademic}</li>
                </ul>
              )}
            </div>
          </div>

          {/* Academic Folder */}
          <div className="card folder-card">
            <Link to="/manage-item" className="link">
              <h3>Academic</h3>
            </Link>
            <div className="folder-list">
              <h4 onClick={() => handleCategoryClick('Academic')}>Academic</h4>
              {selectedCategory === 'Academic' && (
                <ul className="item-list">
                  <li>Total Items: {categoryItemCounts.academic}</li>
                </ul>
              )}
            </div>
          </div>

          {/* Approved Purchase Requests */}
          <div className="card approve-request-card">
            <Link to="/approve-request" className="link">
              <h3>PURCHASED REQUEST</h3>
            </Link>
            <p>Total Approved Requests: {totalApprovedRequests}</p> {/* Display total approved requests */}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
