import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase/firebase-config';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import JsBarcode from 'jsbarcode';
import Camera from '../components/Camera';
import './ManageItem.css';

// Categories
const categories = ["Non Academic", "Academic"];
const nonAcademicOptions = [
  "FINANCE OFFICE",
  "OFFICE OF THE PRESIDENT",
  "HUMAN RESOURCE",
  "LIBRARY",
  "MANAGEMENT INFORMATION SYSTEM",
  "OFFICE OF THE REGISTRAR",
  "OFFICE OF THE STUDENT AFFAIRS AND SERVICES",
  "RESEARCH AND CREATIVE WORKS",
  "ACCOUNTING",
  "CLINIC",
  "GUIDANCE",
  "NATIONAL SERVICE TRAINING PROGRAM",
];
const academicColleges = [
  "COLLEGE OF ARTS AND SCIENCES",
  "COLLEGE OF BUSINESS ADMINISTRATION",
  "COLLEGE OF COMPUTER STUDIES",
  "COLLEGE OF CRIMINOLOGY",
  "COLLEGE OF EDUCATION",
  "COLLEGE OF ENGINEERING",
  "BED"
];
const academicPrograms = {
  "COLLEGE OF ARTS AND SCIENCES": [
    "Bachelor Of Arts In English Language",
    "Bachelor Of Arts In Political Science",
    "Batsilyer Ng Sining Sa Filipino / Bachelor Of Arts In Filipino"
  ],
  "COLLEGE OF BUSINESS ADMINISTRATION": [
    "Bachelor Of Science In Business Administration Major In Marketing Management",
    "Bachelor Of Science In Business Administration Major In Operation Management",
    "Bachelor Of Science In Business Administration Major In Financial Management",
    "Bachelor Of Science In Business Administration Major In Human Resource Management"
  ],
  "COLLEGE OF COMPUTER STUDIES": [
    "BS Computer Science",
    "BS Information Technology"
  ],
  "COLLEGE OF CRIMINOLOGY": [],
  "COLLEGE OF EDUCATION": [
    "Bachelor In Elementary Education",
    "Bachelor In Secondary Education Major In English",
    "Bachelor In Secondary Education Major In Filipino",
    "Bachelor In Secondary Education Major In Math"
  ],
  "COLLEGE OF ENGINEERING": [
    "Bachelor Of Science In Civil Engineering",
    "Bachelor Of Science In Electrical Engineering",
    "Bachelor Of Science In Mechanical Engineering",
    "Bachelor Of Science In Electronics Engineering",
    "Bachelor Of Science In Computer Engineering"
  ],
  "BED": [
    "JUNIOR HIGH SCHOOL",
    "SENIOR HIGH SCHOOL ACCOUNTANCY, BUSINESS & MANAGEMENT (ABM)",
    "SENIOR HIGH SCHOOL HUMANITIES & SOCIAL SCIENCES (HUMSS)",
    "SENIOR HIGH SCHOOL SCIENCE, TECHNOLOGY, ENGINEERING, AND MATHEMATICS (STEM)"
  ]
};

const itemTypes = ["Equipment", "Office Supplies", "Books", "Electrical Parts"];

const Barcode = ({ value }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 50,
        displayValue: true,
      });
    }
  }, [value]);

  return <svg ref={svgRef}></svg>;
};

const ManageItem = () => {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    newItem: "",
    quantity: "",
    amount: "",
    requestedDate: "",
    supplier: "",
    itemType: "Equipment",
    category: "",
    subCategory: "",
    program: "",
    imagePreview: null,
  });
  const [editItem, setEditItem] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [saveOption, setSaveOption] = useState('local');
  const [visibleGroups, setVisibleGroups] = useState({});
  const [viewBy, setViewBy] = useState('category');
  const [notification, setNotification] = useState(null); // Changed to object or null

  useEffect(() => {
    const itemsCollection = collection(db, "items");
    const unsubscribe = onSnapshot(itemsCollection, (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(fetchedItems);
    });

    return () => unsubscribe();
  }, []);

  const generateBarcode = () => `ITEM-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const getSubCategoryOptions = () => {
    switch (formData.category) {
      case "Non Academic":
        return nonAcademicOptions;
      case "Academic":
        return academicColleges;
      default:
        return [];
    }
  };

  const getProgramOptions = () => {
    return academicPrograms[formData.subCategory] || [];
  };

  const handleAddItem = async () => {
    const { newItem, quantity, amount, requestedDate, supplier, itemType, category, subCategory, program, imagePreview } = formData;

    // Check for missing or invalid fields
    if (!newItem || quantity <= 0 || amount < 0 || !requestedDate || !supplier || !itemType || !category || !subCategory) {
      setNotification({ message: "Please fill in all required fields with valid values.", type: "error" });
      return;
    }

    const newBarcode = generateBarcode();
    try {
      await addDoc(collection(db, "items"), {
        text: newItem,
        quantity,
        amount,
        requestedDate: new Date(requestedDate),
        supplier,
        itemType,
        category,
        subCategory,
        program: category === "Academic" && subCategory !== "COLLEGE OF CRIMINOLOGY" ? program : "",
        barcode: newBarcode,
        image: imagePreview,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      clearFields();
      setNotification({ message: "Item added successfully!", type: "success" });

      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error adding document: ", error);
      setNotification({ message: "Error adding item. Please try again.", type: "error" });
    }
  };

  const handleEditItem = (item) => {
    setEditItem(item);
    setFormData({
      newItem: item.text,
      quantity: item.quantity,
      amount: item.amount,
      requestedDate: item.requestedDate.toDate().toISOString().substr(0, 10),
      supplier: item.supplier,
      itemType: item.itemType,
      category: item.category,
      subCategory: item.subCategory,
      program: item.program || "",
      imagePreview: item.image,
    });
  };

  const handleSaveEdit = async () => {
    const { newItem, quantity, amount, requestedDate, supplier, itemType, category, subCategory, program, imagePreview } = formData;
    if (editItem && newItem && quantity > 0 && amount >= 0 && requestedDate && supplier && itemType && category && subCategory) {
      try {
        const itemDoc = doc(db, "items", editItem.id);
        await updateDoc(itemDoc, {
          text: newItem,
          quantity,
          amount,
          requestedDate: new Date(requestedDate),
          supplier,
          itemType,
          category,
          subCategory,
          program: category === "Academic" && subCategory !== "COLLEGE OF CRIMINOLOGY" ? program : "",
          image: imagePreview,
          updatedAt: Timestamp.now(),
        });
        clearFields();
        setEditItem(null);
        setNotification({ message: "Item updated successfully!", type: "success" });
      } catch (error) {
        console.error("Error updating document: ", error);
        setNotification({ message: "Error updating item. Please try again.", type: "error" });
      }
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const itemDoc = doc(db, "items", id);
      await deleteDoc(itemDoc);
      setNotification({ message: "Item deleted successfully!", type: "info" });
    } catch (error) {
      console.error("Error deleting document: ", error);
      setNotification({ message: "Error deleting item. Please try again.", type: "error" });
    }
  };

  const toggleGroupVisibility = (group) => {
    setVisibleGroups((prevState) => ({
      ...prevState,
      [group]: !prevState[group],
    }));
  };

  const groupedItems = items.reduce((acc, item) => {
    let folderKey = viewBy === 'category' ? item.category || "Other" : item.itemType || "Other";

    if (!acc[folderKey]) {
      acc[folderKey] = { items: [], totalQuantity: 0 };
    }

    acc[folderKey].items.push(item);
    acc[folderKey].totalQuantity += item.quantity;
    return acc;
  }, {});

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prevData) => ({
          ...prevData,
          imagePreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveOptionChange = (e) => {
    setSaveOption(e.target.value);
  };

  const handleCameraCapture = async (imageUrl) => {
    if (saveOption === 'local') {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'captured-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert("Image downloaded successfully.");
    } else if (saveOption === 'system') {
      const fileName = `captured-image-${Date.now()}.png`;
      const storageRef = ref(storage, `images/${fileName}`);
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        setFormData((prevData) => ({
          ...prevData,
          imagePreview: downloadURL,
        }));
      } catch (error) {
        console.error("Error uploading file: ", error);
      }
    }
    setIsCameraOpen(false);
  };

  const clearFields = () => {
    setFormData({
      newItem: "",
      quantity: "",
      amount: "",
      requestedDate: "",
      supplier: "",
      itemType: "Equipment",
      category: "",
      subCategory: "",
      program: "",
      imagePreview: null,
    });
  };

  return (
    <div className="manage-item-container">
      <h1>Manage Items</h1>

      {/* Notification Message */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="add-item">
        <input
          type="text"
          name="newItem"
          value={formData.newItem}
          onChange={handleChange}
          placeholder="Add new item"
        />

        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
        >
          <option value="">Select Category</option>
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          name="subCategory"
          value={formData.subCategory}
          onChange={handleChange}
          disabled={!formData.category}
        >
          <option value="">Select Sub-category</option>
          {getSubCategoryOptions().map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {formData.category === "Academic" && formData.subCategory && formData.subCategory !== "COLLEGE OF CRIMINOLOGY" && (
          <select
            name="program"
            value={formData.program}
            onChange={handleChange}
            disabled={!formData.subCategory}
          >
            <option value="">Select Program</option>
            {getProgramOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          name="quantity"
          value={formData.quantity}
          onChange={handleChange}
          placeholder="Quantity"
        />
        <input
          type="text"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="Amount"
        />

        <input
          type="date"
          name="requestedDate"
          value={formData.requestedDate}
          onChange={handleChange}
        />
        <input
          type="text"
          name="supplier"
          value={formData.supplier}
          onChange={handleChange}
          placeholder="Supplier"
        />
        <select name="itemType" value={formData.itemType} onChange={handleChange}>
          {itemTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input type="file" onChange={handleImageUpload} />
        <div>
          <select value={saveOption} onChange={handleSaveOptionChange}>
            <option value="local">Save Locally</option>
            <option value="system">Save to System</option>
          </select>
          <button onClick={() => setIsCameraOpen(true)}>Capture Image</button>
        </div>
        {isCameraOpen && <Camera onCapture={handleCameraCapture} />}
        <button onClick={handleAddItem}>Add Item</button>
      </div>

      <div className="filter-section">
        <label>View By: </label>
        <select value={viewBy} onChange={(e) => setViewBy(e.target.value)}>
          <option value="category">Category</option>
          <option value="itemType">Item Type</option>
        </select>
      </div>

      <div className="item-list">
        {Object.entries(groupedItems).map(([group, { items, totalQuantity }]) => (
          <div key={group} className="group-section">
            <div className="group-header" onClick={() => toggleGroupVisibility(group)}>
              {group} - Total Quantity: {totalQuantity}
            </div>
            {visibleGroups[group] && (
              <table>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Sub-category</th>
                    <th>Program</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                    <th>Requested Date</th>
                    <th>Supplier</th>
                    <th>Type</th>
                    <th>Image</th>
                    <th>Barcode</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.text}</td>
                      <td>{item.subCategory || "N/A"}</td>
                      <td>{item.program || "N/A"}</td>
                      <td>{item.quantity}</td>
                      <td>{item.amount}</td>
                      <td>{item.requestedDate.toDate().toLocaleDateString()}</td>
                      <td>{item.supplier}</td>
                      <td>{item.itemType}</td>
                      <td>{item.image && <img src={item.image} alt="Item" width="50" />}</td>
                      <td><Barcode value={item.barcode} /></td>
                      <td>
                        <button onClick={() => handleEditItem(item)}>Edit</button>
                        <button onClick={() => handleDeleteItem(item.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {editItem && (
        <div className="edit-item">
          <h2>Edit Item</h2>
          <input
            type="text"
            name="newItem"
            value={formData.newItem}
            onChange={handleChange}
            placeholder="Item name"
          />
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="">Select Category</option>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            name="subCategory"
            value={formData.subCategory}
            onChange={handleChange}
            disabled={!formData.category}
          >
            <option value="">Select Sub-category</option>
            {getSubCategoryOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {formData.category === "Academic" && formData.subCategory && (
            <select
              name="program"
              value={formData.program}
              onChange={handleChange}
              disabled={!formData.subCategory}
            >
              <option value="">Select Program</option>
              {getProgramOptions().map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            min="1"
            onChange={handleChange}
          />
          <input
            type="number"
            name="amount"
            value={formData.amount}
            min="0"
            onChange={handleChange}
          />
          <input
            type="date"
            name="requestedDate"
            value={formData.requestedDate}
            onChange={handleChange}
          />
          <input
            type="text"
            name="supplier"
            value={formData.supplier}
            onChange={handleChange}
          />
          <select name="itemType" value={formData.itemType} onChange={handleChange}>
            {itemTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input type="file" onChange={handleImageUpload} />
          {formData.imagePreview && <img src={formData.imagePreview} alt="Item Preview" width="50" />}
          <button onClick={handleSaveEdit}>Save</button>
        </div>
      )}
    </div>
  );
};

export default ManageItem;
