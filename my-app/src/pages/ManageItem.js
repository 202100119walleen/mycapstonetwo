import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '../firebase/firebase-config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './ManageItem.css';
import JsBarcode from 'jsbarcode';
import WebcamCapture from './WebcamCapture';

const ManageItem = () => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateDelivered, setDateDelivered] = useState({});
  const [imageFiles, setImageFiles] = useState({});
  const [editMode, setEditMode] = useState({});
  const [visibleSections, setVisibleSections] = useState({});

  // Fetch items from Firestore
  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(requestCollection, (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(fetchedItems);
    });
    return () => unsubscribe();
  }, []);

  const flattenedItems = items.flatMap((request) =>
    Array.isArray(request.itemName) ? request.itemName.map((item, index) => ({
      uniqueId: `${request.uniqueId}-${index + 1}`, // Ensure unique ID
      itemName: item.name,
      purchasedQuantity: item.purchasedQuantity || 0,
      requestedQuantity: item.quantity || 0,
      supplierName: request.supplierName,
      category: request.category,
      college: request.college || 'N/A',
      department: request.department || 'N/A',
      program: request.program || 'N/A',
      requestDate: new Date(request.requestDate).toLocaleDateString(),
      requestPurpose: request.requestPurpose || 'N/A',
      specificType: request.specificType || 'N/A',
      requestId: request.id,
      dateDelivered: request.dateDelivered || '',
      image: request.image || null,
      isApproved: request.approved || false,
      amount: item.totalAmount || 0, // Ensure amount is included
    })) : []
  );

  const downloadBarcode = (uniqueId, itemName) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, uniqueId, {
      format: 'CODE128',
      displayValue: true,
      text: itemName,
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${uniqueId}-${itemName}-barcode.png`;
    link.click();
  };

  const groupedItems = flattenedItems.reduce((acc, item) => {
    const collegeKey = item.college;
    if (!acc[collegeKey]) {
      acc[collegeKey] = [];
    }
    acc[collegeKey].push(item);
    return acc;
  }, {});

  const handleDelete = async (id) => {
    const requestToDelete = flattenedItems.find(item => item.requestId === id);
    
    if (requestToDelete && requestToDelete.isApproved) {
      alert("This item cannot be deleted because it is approved.");
      return;
    }
  
    const requestRef = doc(db, 'requests', id);
    
    if (window.confirm("Are you sure you want to delete this item?")) {
      await deleteDoc(requestRef);
    }
  };  

  const handleDateChange = (uniqueId, date) => {
    setDateDelivered((prev) => ({ ...prev, [uniqueId]: date }));
  };

  const handleImageChange = (uniqueId, file) => {
    setImageFiles((prev) => ({ ...prev, [uniqueId]: file }));
  };

  const handleEditToggle = (uniqueId) => {
    setEditMode((prev) => ({ ...prev, [uniqueId]: !prev[uniqueId] }));
  };

  const handleUpdate = async (uniqueId) => {
    const requestToUpdate = flattenedItems.find(item => item.uniqueId === uniqueId);
  
    if (!requestToUpdate) {
      alert("Item not found for update.");
      return;
    }
  
    const requestRef = doc(db, 'requests', requestToUpdate.requestId);
    let imageUrl = null;
  
    // Handle image upload if a new image file is provided
    if (imageFiles[uniqueId]) {
      try {
        const storageRef = ref(storage, `images/${imageFiles[uniqueId].name}`);
        await uploadBytes(storageRef, imageFiles[uniqueId]);
        imageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Error uploading image:", error);
        imageUrl = requestToUpdate.image; // Keep the old image URL if upload fails
      }
    } else {
      imageUrl = requestToUpdate.image; // If no new image, retain the current one
    }
  
    // Update Firestore document with the new values
    await updateDoc(requestRef, {
      dateDelivered: dateDelivered[uniqueId] || requestToUpdate.dateDelivered,
      image: imageUrl, // Save the image URL
    });
  
    // Reset the state for the updated item
    setDateDelivered((prev) => ({ ...prev, [uniqueId]: '' }));
    setImageFiles((prev) => ({ ...prev, [uniqueId]: null }));
    setEditMode((prev) => ({ ...prev, [uniqueId]: false }));
  };
  
  const filteredItems = flattenedItems.filter(item => 
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()) // Added unique ID search
  );

  const copyToClipboard = (uniqueId) => {
    navigator.clipboard.writeText(uniqueId).then(() => {
      alert("Unique ID copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy: ", err);
    });
  };

  const toggleVisibility = (college) => {
    setVisibleSections((prev) => ({ ...prev, [college]: !prev[college] }));
  };

  return (
    <div className="manage-item">
      <h1>Manage Item</h1>
      <input
        type="text"
        placeholder="Search Colleges, Departments, Category, Item Name, or Unique ID"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-barmanage"
      />
      {searchQuery && filteredItems.length > 0 ? (
        <div>
          <h2>Search Results:</h2>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th data-label="Unique ID">Unique ID</th>
                  <th data-label="Item Name">Item Name</th>
                  <th data-label="Requested Quantity">Requested Quantity</th>
                  <th data-label="Delivered Quantity">Delivered Quantity</th>
                  <th data-label="Amount">Amount</th> {/* Added Amount column */}
                  <th data-label="Supplier Name">Supplier Name</th>
                  <th data-label="Category">Category</th>
                  <th data-label="Department">Department</th>
                  <th data-label="Program">Program</th>
                  <th data-label="Request Date">Request Date</th>
                  <th data-label="Request Purpose">Request Purpose</th>
                  <th data-label="Specific Type">Specific Type</th>
                  <th data-label="Date Delivered">Date Delivered</th>
                  <th data-label="Image Upload">Image Upload</th>
                  <th data-label="Actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.uniqueId}>
                    <td>
                      <span 
                        style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} 
                        onClick={() => copyToClipboard(item.uniqueId)}
                      >
                        {item.uniqueId}
                      </span>
                    </td>
                    <td>
                      <span 
                        style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} 
                        onClick={() => downloadBarcode(item.uniqueId, item.itemName)}
                      >
                        {item.itemName}
                      </span>
                    </td>
                    <td>{item.requestedQuantity}</td> {/* Display as plain text */}
                    <td>{item.purchasedQuantity}</td> {/* Display as plain text */}
                    <td>{item.amount}</td> {/* Display amount */}
                    <td>{item.supplierName}</td>
                    < td>{item.category}</td>
                    <td>{item.department}</td>
                    <td>{item.program}</td>
                    <td>{item.requestDate}</td>
                    <td>{item.requestPurpose}</td>
                    <td>{item.specificType}</td>
                    <td>
                      <input
                        type="date"
                        value={dateDelivered[item.uniqueId] || item.dateDelivered}
                        onChange={(e) => handleDateChange(item.uniqueId, e.target.value)}
                        disabled={!editMode[item.uniqueId]} // Only editable in edit mode
                      />
                    </td>
                    <td>
                      {editMode[item.uniqueId] && (
                        <WebcamCapture 
                          requestId={item.requestId} 
                          editMode={editMode[item.uniqueId]} 
                          onCapture={(imageSrc) => handleImageChange(item.uniqueId, imageSrc)}
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(item.uniqueId, e.target.files[0])}
                        disabled={!editMode[item.uniqueId]} // Only editable in edit mode
                      />
                    </td>
                    <td>
                      <button 
                        onClick={() => {
                          if (item.image) {
                            window.open(item.image, '_blank');
                          } else {
                            alert("No image available.");
                          }
                        }}
                      >
                        View Image
                      </button>
                      {editMode[item.uniqueId] ? (
                        <button onClick={() => handleUpdate(item.uniqueId)}>Save</button>
                      ) : (
                        <button onClick={() => handleEditToggle(item.uniqueId)}>Edit</button>
                      )}
                      <button 
                        onClick={() => handleDelete(item.requestId)} 
                        disabled={item.isApproved}
                      >
                        Delete
                      </button>
                      <button onClick={() => downloadBarcode(item.uniqueId, item.itemName)}>Download Barcode</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        searchQuery && <p>No items match your search criteria.</p>
      )}
      {searchQuery === '' && Object.keys(groupedItems).length > 0 && (
        <div>
          <h2>All Items:</h2>
          {Object.keys(groupedItems).map((college) => (
            <div key={college}>
              <h2 onClick={() => toggleVisibility(college)} style={{ cursor: 'pointer' }}>
                {college} Items {visibleSections[college] ? '▼' : '▲'}
              </h2>
              {visibleSections[college] && (
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th data-label="Unique ID">Unique ID</th>
                        <th data-label="Item Name">Item Name</th>
                        <th data-label="Requested Quantity">Requested Quantity</th>
                        <th data-label="Delivered Quantity">Delivered Quantity</th>
                        <th data-label="Amount">Amount</th> {/* Added Amount column */}
                        <th data-label="Supplier Name">Supplier Name</th>
                        <th data-label="Category">Category</th>
                        <th data-label="Department">Department</th>
                        <th data-label="Program">Program</th>
                        <th data-label="Request Date">Request Date</th>
                        <th data-label="Request Purpose">Request Purpose</th>
                        <th data-label="Specific Type">Specific Type</th>
                        <th data-label="Date Delivered">Date Delivered</th>
                        <th data-label="Image Upload">Image Upload</th>
                        <th data-label="Actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedItems[college].map((item) => (
                        <tr key={item.uniqueId}>
                          <td>
                            <span 
                              style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} 
                              onClick={() => copyToClipboard(item.uniqueId)}
                            >
                              {item.uniqueId}
                            </span>
                          </td>
                          <td>
                            <span 
                              style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} 
                              onClick={() => downloadBarcode(item.uniqueId, item.itemName)}
                            >
                              {item.itemName}
                            </span>
                          </td>
                          <td>{item.requestedQuantity}</td> {/* Display as plain text */}
                          <td>{item.purchasedQuantity}</td> {/* Display as plain text */}
                          <td>{item.amount}</td> {/* Display amount */}
                          <td>{item.supplierName}</td>
                          <td>{item.category}</td>
                          <td>{item.department}</td>
                          <td>{item.program}</td>
                          <td>{item.requestDate}</td>
                          <td>{item.requestPurpose}</td>
                          <td>{item.specificType}</td>
                          <td>
                            <input
                              type="date"
                              value={dateDelivered[item.uniqueId] || item.dateDelivered}
                              onChange={(e) => handleDateChange(item.uniqueId, e.target.value)}
                              disabled={!editMode[item.uniqueId]} // Only editable in edit mode
                            />
                          </td>
                          <td>
                            {editMode[item.uniqueId] && (
                              <WebcamCapture 
                                requestId={item.requestId} 
                                editMode={editMode[item.uniqueId]} 
                                onCapture={(imageSrc) => handleImageChange(item.uniqueId, imageSrc)}
                              />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(item.uniqueId, e.target.files[0])}
                              disabled={!editMode[item.uniqueId]} // Only editable in edit mode
                            />
                          </td>
                          <td>
                            <button 
                              onClick={() => {
                                if (item.image) {
                                  window.open(item.image, '_blank');
                                } else {
                                  alert("No image available.");
                                }
                              }}
                            >
                              View Image
                            </button>
                            {editMode[item.uniqueId] ? (
                              <button onClick={() => handleUpdate(item.uniqueId)}>Save</button>
                            ) : (
                              <button onClick={() => handleEditToggle(item.uniqueId)}>Edit</button>
                            )}
                            <button 
                              onClick={() => handleDelete(item.requestId)} 
                              disabled={item.isApproved}
                            >
                              Delete
                            </button>
                            <button onClick={() => downloadBarcode(item.uniqueId, item.itemName)}>Download Barcode</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageItem;