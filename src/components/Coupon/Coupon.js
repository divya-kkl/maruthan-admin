import React, { useState, useEffect } from 'react';
import { GraphQLClient, gql } from 'graphql-request';
import { FaEdit, FaTrash, FaPlus, FaTicketAlt } from 'react-icons/fa';
import './Coupon.css';

const GRAPHQL_ENDPOINT = process.env.REACT_APP_GRAPHQL_ENDPOINT || "http://localhost:2000/graphql";
const client = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    authorization: `Bearer ${localStorage.getItem('jwtToken')}`
  }
});

const GET_ALL_COUPONS = gql`
  query GetAllCoupons {
    getAllCoupons {
      id
      name
      code
      type
      value
      expireDate
      isActive
      minimumUses
      usesCount
    }
  }
`;

const CREATE_COUPON = gql`
  mutation CreateCoupon($input: CreateCouponInput!) {
    createCoupon(input: $input) {
      id
    }
  }
`;

const UPDATE_COUPON = gql`
  mutation UpdateCoupon($id: ID!, $input: UpdateCouponInput!) {
    updateCoupon(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_COUPON = gql`
  mutation DeleteCoupon($id: ID!) {
    deleteCoupon(id: $id)
  }
`;

function Coupon() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '',
    expireDate: '',
    minimumUses: '1',
    isActive: true
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await client.request(GET_ALL_COUPONS);
      setCoupons(data.getAllCoupons || []);
    } catch (err) {
      console.error("Error fetching coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const isNumeric = /^\d+$/.test(dateString);
    const date = new Date(isNumeric ? parseInt(dateString) : dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const handleOpenModal = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code || '',
        type: coupon.type || 'PERCENTAGE',
        value: coupon.value ? coupon.value.toString() : '',
        expireDate: formatDateForInput(coupon.expireDate),
        minimumUses: coupon.minimumUses ? coupon.minimumUses.toString() : '1',
        isActive: coupon.isActive !== undefined ? coupon.isActive : true
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        type: 'PERCENTAGE',
        value: '',
        expireDate: '',
        minimumUses: '1',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === 'code' ? value.toUpperCase() : value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const discountVal = parseFloat(formData.value);
      if (isNaN(discountVal) || discountVal < 0) {
        alert("Please enter a valid discount value.");
        return;
      }
      if (formData.type === 'PERCENTAGE' && discountVal > 100) {
        alert("Percentage discount cannot exceed 100.");
        return;
      }

      if (!formData.code.trim() || !formData.expireDate) {
        alert("Please fill all required fields (Code, Expire Date).");
        return;
      }

      const input = {
        name: formData.code.trim(), // Backend requires name, so we send code as name
        code: formData.code.trim(),
        type: formData.type,
        value: discountVal,
        expireDate: formData.expireDate,
        isActive: formData.isActive,
        minimumUses: parseInt(formData.minimumUses) || 1
      };

      if (editingCoupon) {
        await client.request(UPDATE_COUPON, {
          id: editingCoupon.id,
          input: input
        });
      } else {
        await client.request(CREATE_COUPON, {
          input: input
        });
      }
      handleCloseModal();
      fetchCoupons();
    } catch (err) {
      console.error("Error saving coupon:", err);
      alert("Failed to save coupon. Please ensure all required fields are correct or check backend schema.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      try {
        await client.request(DELETE_COUPON, { id });
        fetchCoupons();
      } catch (err) {
        console.error("Error deleting coupon:", err);
        alert("Failed to delete coupon.");
      }
    }
  };

  if (loading && coupons.length === 0) return <div>Loading coupons...</div>;

  return (
    <div className="coupon-admin-container">
      <div className="coupon-admin-header">
        <h2>Coupons Management</h2>
        <button className="add-btn" onClick={() => handleOpenModal()}>
          <FaPlus /> Add New Coupon
        </button>
      </div>

      <table className="coupon-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Expire Date</th>
            <th>Uses</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id}>
              <td style={{ fontWeight: 'bold', color: '#2980b9' }}>{coupon.code}</td>
              <td style={{ fontWeight: '500' }}>
                {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `₹${coupon.value}`}
              </td>
              <td>{coupon.expireDate ? new Date(/^\d+$/.test(coupon.expireDate) ? parseInt(coupon.expireDate) : coupon.expireDate).toLocaleDateString('en-GB') : 'N/A'}</td>
              <td>{coupon.usesCount} / {coupon.minimumUses}</td>
              <td>
                <span className={`status-badge ${coupon.isActive ? 'active' : 'inactive'}`}>
                  {coupon.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </td>
              <td className="action-btns">
                <button className="edit-btn" onClick={() => handleOpenModal(coupon)}>
                  <FaEdit />
                </button>
                <button className="delete-btn" onClick={() => handleDelete(coupon.id)}>
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
          {coupons.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>No coupons found</td>
            </tr>
          )}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FaTicketAlt className="modal-icon" /> {editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Coupon Code *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    placeholder="e.g., SUMMER50"
                  />
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Discount Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #bdc3c7' }}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Cash / Flat (₹)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    required
                    placeholder={formData.type === 'PERCENTAGE' ? "e.g. 10" : "e.g. 500"}
                  />
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Expire Date *</label>
                  <input
                    type="date"
                    name="expireDate"
                    value={formData.expireDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Total Uses</label>
                  <input
                    type="number"
                    min="1"
                    name="minimumUses"
                    value={formData.minimumUses}
                    onChange={handleChange}
                    required
                    placeholder="e.g. 100"
                  />
                </div>
              </div>
              <div className="form-group status-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  Active
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Coupon;
