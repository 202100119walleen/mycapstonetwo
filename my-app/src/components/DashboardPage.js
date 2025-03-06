import React, { useState, useEffect, useRef } from 'react'; 
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase-config';
import { db, storage } from '../firebase/firebase-config'; 
import { collection, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Dashboard.css';

const DashboardPage = () => {
  const [totalItems, setTotalItems] = useState(0);
  const [categoryItemCounts, setCategoryItemCounts] = useState({ nonAcademic: 0, academic: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [totalApprovedRequests, setTotalApprovedRequests] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileImage, setProfileImage] = useState('userdashboard.png'); // Default profile image
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const userName = "Admin";

  useEffect(() => {
    // Fetch total items
    const itemsCollection = collection(db, 'items');
    const unsubscribeItems = onSnapshot(itemsCollection, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data());
      setTotalItems(items.length);
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    // Fetch approved requests
    const requestsCollection = collection(db, 'requests');
    const unsubscribeRequests = onSnapshot(requestsCollection, (snapshot) => {
      const requests = snapshot.docs.map(doc => doc.data());
      const totalApproved = requests.filter(request => request.approved).length;
      setTotalApprovedRequests(totalApproved);

      const categoryMap = { nonAcademic: 0, academic: 0 };
      requests.forEach(request => {
        if (request.approved) {
          if (request.college === "Non Academic") {
            categoryMap.nonAcademic += request.itemName.reduce((sum, item) => sum + (item.purchasedQuantity || 0), 0);
          } else if (request.college === "Academic") {
            categoryMap.academic += request.itemName.reduce((sum, item) => sum + (item.quantity || 0), 0);
          }
        }
      });

      setCategoryItemCounts(categoryMap);
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
    fileInputRef.current.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const storageRef = ref(storage, `profile-images/${file.name}`);
      uploadBytes(storageRef, file)
        .then(() => getDownloadURL(storageRef))
        .then((url) => {
          setProfileImage(url); // Update the profile image state with the new URL
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
            <img
              src={profileImage} // Display the updated profile image
              alt="Profile Icon"
              className="profile-icon"
              onClick={toggleDropdown} // Toggle dropdown on click
              style={{ cursor: 'pointer' }}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageUpload}
              accept="image/*" // Accept only image files
            />
            <span className="user-name">{userName}</span>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <button onClick={handleImageClick}>Change Profile Picture</button>
                <button onClick={() => alert('Viewing profile image...')}>View Profile Image</button>
                <Link to="/settings">Account Settings</Link>
                <button onClick={handleLogout}></button>
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

          <div className="card approve-request-card">
            <Link to="/approve-request" className="link">
              <h3>PURCHASED REQUEST</h3>
            </Link>
            <p>Total Approved Requests: {totalApprovedRequests}</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;