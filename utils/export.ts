import * as XLSX from 'xlsx';
import { PersonWithDetails, CategoryWithCount, GroupWithCount } from '@/types';

export const exportToExcel = (
  data: PersonWithDetails[],
  categories: CategoryWithCount[] | any[],
  groups: GroupWithCount[] | any[],
  filename: string = 'people_data.xlsx'
) => {
  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN') : '');

  const peopleData = data.map(p => ({
    'Full Name': p.full_name,
    'Mobile 1': p.mobile_number || '',
    'Mobile 2': p.mobile_number_2 || '',
    'Email': p.email || '',
    'Date of Birth': fmt(p.dob),
    'Blood Group': p.blood_group || '',
    'Marital Status': p.marital_status || '',
    'Anniversary Date': fmt(p.anniversary_date),
    'Aadhar Card No': p.aadhar_card_no || '',
    'Address': p.address || '',
    'Category': p.category?.category_name || '',
    'Groups': p.groups?.map(g => g.group_name).join(', ') || '',
    'Is Ambrish': p.is_ambrish ? 'Yes' : 'No',
    'Dixa Date': fmt(p.dixa_date),
    'AVD Code': p.avd_code || '',
    'Attended Mahotsav': p.attended_mahotsav || '',
    'Attending Sabha Since': p.attending_sabha_since || '',
    'Reference Person': p.reference_person || '',
    'Education Qualification': p.education_qualification || '',
    'Running Education': p.running_education || '',
    'Occupation': p.occupation || '',
    'Job/Business Details': p.job_business_details || '',
    'Hobby': p.hobby || '',
    'Photo URL': p.photo_url || '',
  }));

  const categoriesData = categories.map((c: any) => ({
    'Category ID': c.category_id,
    'Category Name': c.category_name,
    'Person Count': c.person_count ?? '',
  }));

  const groupsData = groups.map((g: any) => ({
    'Group ID': g.group_id,
    'Group Name': g.group_name,
    'Member Count': g.person_count ?? '',
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(peopleData), 'People');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoriesData), 'Categories');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupsData), 'Groups');
  XLSX.writeFile(wb, filename);
};

