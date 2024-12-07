import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { storage } from '../firebase/firebase-config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './ManageItem.css';
import JsBarcode from 'jsbarcode';

const ManageItem = () => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateDelivered, setDateDelivered] = useState({});
  const [itemQuantities, setItemQuantities] = useState({});
  const [requestedQuantities, setRequestedQuantities] = useState({});
  const [imageFiles, setImageFiles] = useState({});
  const [editMode, setEditMode] = useState({});
  const [visibleSections, setVisibleSections] = useState({});

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
    request.itemName.map((item) => ({
      uniqueId: request.uniqueId,
      itemName: item.name,
      purchasedQuantity: item.purchasedQuantity || 0, // Use purchasedQuantity from the item
      requestedQuantity: item.quantity || 0, // Ensure this reflects the requested quantity
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
      isApproved: request.approved || false, // Check if the request is approved
    }))
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

  const handleDateChange = (id, date) => {
    setDateDelivered((prev) => ({ ...prev, [id]: date }));
  };

  const handleQuantityChange = (id, quantity) => {
    setItemQuantities((prev) => ({ ...prev, [id]: quantity }));
  };

  const handleRequestedQuantityChange = (id, quantity) => {
    setRequestedQuantities((prev ) => ({ ...prev, [id]: quantity }));
  };

  const handleImageChange = (id, file) => {
    setImageFiles((prev) => ({ ...prev, [id]: file }));
  };

  const handleEditToggle = (id) => {
    setEditMode((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdate = async (id) => {
    const requestRef = doc(db, 'requests', id);
    let imageUrl = null;

    if (imageFiles[id]) {
      try {
        const storageRef = ref(storage, `images/${imageFiles[id].name}`);
        await uploadBytes(storageRef, imageFiles[id]);
        imageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Error uploading image:", error);
        imageUrl = null; // Handle the error as needed
      }
    }

    await updateDoc(requestRef, {
      dateDelivered: dateDelivered[id] || null,
      purchasedQuantity: itemQuantities[id] || null,
      requestedQuantity: requestedQuantities[id] || null,
      image: imageUrl || null,
    });

    setDateDelivered((prev) => ({ ...prev, [id]: '' }));
    setItemQuantities((prev) => ({ ...prev, [id]: null }));
    setRequestedQuantities((prev) => ({ ...prev, [id]: null }));
    setImageFiles((prev) => ({ ...prev, [id]: null }));
    setEditMode((prev) => ({ ...prev, [id]: false }));
  };

  const filteredItems = flattenedItems.filter(item => 
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.program.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleVisibility = (college) => {
    setVisibleSections((prev) => ({ ...prev, [college]: !prev[college] }));
  };

  return (
    <div className="manage-item">
      <h1>Manage Item</h1>
      <input
        type="text"
        placeholder="Search Colleges, Departments, Category, Item Name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-barmanage"
      />
      {searchQuery && filteredItems.length > 0 ? (
        <div>
          <h2>Search Results:</h2>
          <table>
            <thead>
              <tr>
                <th data-label="Unique ID">Unique ID</th>
                <th data-label="Item Name">Item Name</th>
                <th data-label="Delivered Quantity">Delivered Quantity</th>
                <th data-label="Requested Quantity">Requested Quantity</th>
                <th data-label="Supplier Name">Supplier Name</th>
                <th data-label="Category">Category</th>
                <th data-label="Department">Department</th>
                <th data-label="Program">Program</th>
                <th data-label="Request Date">Request Date</th>
                <th data-label="Request Purpose">Request Purpose</th>
                <th data-label="Specific Type">Specific Type</th>
                <th data-label="Date Delivered">Date Delivered</th>
                <th data-label="Image Upload">Image Upload</th>
                <th data-label="Image View">Image View</th>
                <th data-label="Actions">Actions</th>
                <th data-label="Download Barcode">Download Barcode</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.uniqueId}>
                  <td>{item.uniqueId}</td>
                  <td>
                    <span 
                      style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} 
                      onClick={() => downloadBarcode(item.uniqueId, item.itemName)}
                    >
                      {item.itemName}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={itemQuantities[item.requestId] || item.purchasedQuantity}
                      onChange={(e) => handleQuantityChange(item.requestId, e.target.value)}
                      disabled={!editMode[item.requestId]}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={requestedQuantities[item.requestId] || item.requestedQuantity}
                      on Change={(e) => handleRequestedQuantityChange(item.requestId, e.target.value)}
                      disabled={!editMode[item.requestId]}
                    />
                  </td>
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
                      value={dateDelivered[item.requestId] || item.dateDelivered}
                      onChange={(e) => handleDateChange(item.requestId, e.target.value)}
                      disabled={!editMode[item.requestId]}
                    />
                  </td>
                  <td>
                    <input
                      type="file"
                      onChange={(e) => handleImageChange(item.requestId, e.target.files[0])}
                      disabled={!editMode[item.requestId]}
                    />
                  </td>
                  <td>
                    {item.image ? (
                      <a href={item.image} target="_blank" rel="noopener noreferrer">
                        View Image
                      </a>
                    ) : (
                      <span>No Image</span>
                    )}
                  </td>
                  <td>
                    {editMode[item.requestId] ? (
                      <button onClick={() => handleUpdate(item.requestId)}>Save</button>
                    ) : (
                      <button onClick={() => handleEditToggle(item.requestId)}>Edit</button>
                    )}
                    <button 
                      onClick={() => handleDelete(item.requestId)} 
                      disabled={item.isApproved}
                    >
                      Delete
                    </button>
                  </td>
                  <td>
                    <button onClick={() => downloadBarcode(item.uniqueId, item.itemName)}>Download Barcode</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <table>
                  <thead>
                    <tr>
                    <th data-label="Unique ID">Unique ID</th>
          <th data-label="Item Name">Item Name</th>
          <th data-label="Requested Quantity">Requested Quantity</th> {/* Moved here */}
          <th data-label="Delivered Quantity">Delivered Quantity</th> {/* Moved here */}
          <th data-label="Supplier Name">Supplier Name</th>
          <th data-label="Category">Category</th>
          <th data-label="Department">Department</th>
          <th data-label="Program">Program</th>
          <th data-label="Request Date">Request Date</th>
          <th data-label="Request Purpose">Request Purpose</th>
          <th data-label="Specific Type">Specific Type</th>
          <th data-label="Date Delivered">Date Delivered</th>
          <th data-label="Image Upload">Image Upload</th>
          <th data-label="Image View">Image View</th>
          <th data-label="Actions">Actions</th>
          <th data-label="Download Barcode">Download Barcode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedItems[college].map((item) => (
                      <tr key={item.uniqueId}>
                        <td>{item.uniqueId}</td>
                        <td>
                          <span 
                            style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }} 
                            onClick={() => downloadBarcode(item.uniqueId, item.itemName)}
                          >
                            {item.itemName}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={itemQuantities[item.requestId] || item.purchasedQuantity}
                            onChange={(e) => handleQuantityChange(item.requestId, e.target.value)}
                            disabled={!editMode[item.requestId]}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={requestedQuantities[item.requestId] || item.requestedQuantity}
                            onChange={(e) => handleRequestedQuantityChange(item.requestId, e.target.value)}
                            disabled={!editMode[item.requestId]}
                          />
                        </td>
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
                            value={dateDelivered[item.requestId] || item.dateDelivered}
                            onChange={(e) => handleDateChange(item.requestId, e.target.value)}
                            disabled={!editMode[item.requestId]}
                          />
                        </td>
                        <td>
                          <input
                            type="file"
                            onChange={(e) => handleImageChange(item.requestId, e.target.files[0])}
                            disabled={!editMode[item.requestId]}
                          />
                        </td>
                        <td>
                          {item.image ? (
                            <a href={item.image} target="_blank" rel="noopener noreferrer">
                              View Image
                            </a>
                          ) : (
                            <span>No Image</span>
                          )}
                        </td>
                        <td>
                          {editMode[item.requestId] ? (
                            <button onClick={() => handleUpdate(item.requestId)}>Save</button>
                          ) : (
                            <button onClick={() => handleEditToggle(item.requestId)}>Edit</button>
                          )}
                          <button 
                            onClick={() => handleDelete(item.requestId)} 
                            disabled={item.isApproved}
                          >
                            Delete
                          </button>
                        </td>
                        <td>
                          <button onClick={() => downloadBarcode(item.uniqueId, item.itemName)}>Download Barcode</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageItem;