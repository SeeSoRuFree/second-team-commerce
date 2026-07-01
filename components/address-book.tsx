'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface Address {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  const handleAddAddress = async () => {
    try {
      const response = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const newAddress = await response.json();
        setAddresses([...addresses, newAddress]);
        setFormData({
          name: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          country: 'US',
        });
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error adding address:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">배송지 목록</h3>
        <Button onClick={() => setShowForm(!showForm)} variant="outline">
          {showForm ? '취소' : '배송지 추가'}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <Label>배송지 이름</Label>
            <Input
              placeholder="집, 회사 등"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>수령인</Label>
            <Input
              placeholder="받으실 분 성함"
              value={formData.city}
              onChange={e =>
                setFormData({ ...formData, city: e.target.value })
              }
            />
          </div>
          <div>
            <Label>우편번호</Label>
            <Input
              placeholder="12345"
              value={formData.state}
              onChange={e =>
                setFormData({ ...formData, state: e.target.value })
              }
            />
          </div>
          <div>
            <Label>도로명주소</Label>
            <Input
              placeholder="도로명주소를 입력하세요"
              value={formData.address}
              onChange={e =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>
          <div>
            <Label>상세주소</Label>
            <Input
              placeholder="상세주소를 입력하세요"
              value={formData.zip}
              onChange={e =>
                setFormData({ ...formData, zip: e.target.value })
              }
            />
          </div>
          <Button onClick={handleAddAddress} className="w-full">
            배송지 저장
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            저장된 배송지가 없습니다
          </p>
        ) : (
          addresses.map(addr => (
            <div key={addr.id} className="rounded-lg border p-3">
              <p className="font-medium">{addr.name}</p>
              <p className="text-sm text-muted-foreground">
                [{addr.state}] {addr.address} {addr.zip}
              </p>
              <p className="text-sm text-muted-foreground">
                수령인 {addr.city}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
