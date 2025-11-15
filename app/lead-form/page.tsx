'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { leadAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getAllDistricts, getMandalsByDistrict } from '@/lib/andhra-pradesh-data';

export default function LeadFormPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    hallTicketNumber: '',
    name: '',
    phone: '',
    email: '',
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    gender: '',
    courseInterested: '',
    interCollege: '',
    rank: '',
    village: '',
    district: '',
    mandal: '',
    state: 'Andhra Pradesh',
    quota: 'Not Applicable',
    applicationStatus: '',
  });

  // Get districts from hardcoded data
  const districts = useMemo(() => getAllDistricts(), []);

  // Get mandals based on selected district
  const mandals = useMemo(() => {
    if (!formData.district) return [];
    return getMandalsByDistrict(formData.district);
  }, [formData.district]);

  // Reset mandal when district changes
  useEffect(() => {
    if (formData.district) {
      setFormData((prev) => ({ ...prev, mandal: '' }));
    }
  }, [formData.district]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    // Reset mandal if district is changed
    if (name === 'district') {
      setFormData((prev) => ({ ...prev, mandal: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate required fields
    if (
      !formData.name ||
      !formData.phone ||
      !formData.fatherName ||
      !formData.fatherPhone ||
      !formData.village ||
      !formData.district ||
      !formData.mandal
    ) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      await leadAPI.submitPublicLead({
        hallTicketNumber: formData.hallTicketNumber || undefined,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        fatherName: formData.fatherName,
        fatherPhone: formData.fatherPhone,
        motherName: formData.motherName || undefined,
        gender: formData.gender || undefined,
        courseInterested: formData.courseInterested || undefined,
        interCollege: formData.interCollege || undefined,
        rank: formData.rank ? Number(formData.rank) : undefined,
        village: formData.village,
        district: formData.district,
        mandal: formData.mandal,
        state: formData.state || undefined,
        quota: 'Not Applicable',
        applicationStatus: 'Not Provided',
        source: 'Public Form',
      });

      // Show success message
      setShowSuccess(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          hallTicketNumber: '',
          name: '',
          phone: '',
          email: '',
          fatherName: '',
          fatherPhone: '',
          motherName: '',
          gender: '',
          courseInterested: '',
          interCollege: '',
          rank: '',
          village: '',
          district: '',
          mandal: '',
          state: 'Andhra Pradesh',
          quota: 'Not Applicable',
          applicationStatus: '',
        });
        setShowSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background gradient effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Lead Submission Form</h1>
              <Link href="/">
                <Button variant="outline">Home</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {showSuccess ? (
            <Card>
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                <p className="text-gray-600 mb-6">
                  Your lead information has been submitted successfully. We will get back to you soon.
                </p>
                <Link href="/">
                  <Button variant="primary">Go to Home</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-xl font-semibold mb-6">Please fill in your details</h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hall Ticket Number */}
                  <div>
                    <Input
                      label="Hall Ticket Number"
                      name="hallTicketNumber"
                      value={formData.hallTicketNumber}
                      onChange={handleChange}
                      placeholder="Enter Hall Ticket Number"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <Input
                      label="Name *"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <Input
                      label="Phone Number *"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <Input
                      label="Email (Optional)"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Father Name */}
                  <div>
                    <Input
                      label="Father's Name *"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Father Phone */}
                  <div>
                    <Input
                      label="Father's Phone Number *"
                      name="fatherPhone"
                      type="tel"
                      value={formData.fatherPhone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Mother's Name */}
                  <div>
                    <Input
                      label="Mother's Name (Optional)"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Not Specified">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Village */}
                  <div>
                    <Input
                      label="Village *"
                      name="village"
                      value={formData.village}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* District */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                    >
                      <option value="">Select District</option>
                      {districts && districts.length > 0 ? (
                        districts.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Loading districts...</option>
                      )}
                    </select>
                  </div>

                  {/* Mandal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mandal *
                    </label>
                    <select
                      name="mandal"
                      value={formData.mandal}
                      onChange={handleChange}
                      required
                      disabled={!formData.district}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {formData.district ? 'Select Mandal' : 'Select District first'}
                      </option>
                      {mandals && mandals.length > 0 ? (
                        mandals.map((mandal) => (
                          <option key={mandal} value={mandal}>
                            {mandal}
                          </option>
                        ))
                      ) : formData.district ? (
                        <option value="" disabled>No mandals found for this district</option>
                      ) : null}
                    </select>
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                    />
                  </div>

                  {/* Course Interested */}
                  <div>
                    <Input
                      label="Course Interested (Optional)"
                      name="courseInterested"
                      value={formData.courseInterested}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Inter College */}
                  <div>
                    <Input
                      label="Inter College (Optional)"
                      name="interCollege"
                      value={formData.interCollege}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Rank */}
                  <div>
                    <Input
                      label="Rank (Optional)"
                      name="rank"
                      type="number"
                      min="0"
                      value={formData.rank}
                      onChange={handleChange}
                    />
                  </div>

                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </Button>
                  <Link href="/" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

