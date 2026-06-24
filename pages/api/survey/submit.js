import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    email, industry, industryOther, functions, functionOther, workflow, aiSuggestion,
    contactName, contactMethod, company
  } = req.body;

  if (!industry || !functions || !Array.isArray(functions) || functions.length === 0 || !workflow || !contactName || !contactMethod) {
    return res.status(400).json({ success: false, error: '请填写所有必填字段' });
  }

  const actualIndustry = industry === '其他' ? industryOther : industry;
  const actualFunctions = functions.filter(f => f !== '其他');
  if (functions.includes('其他') && functionOther) {
    actualFunctions.push(functionOther);
  }

  try {
    // Create table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS survey_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NULL,
        industry VARCHAR(100),
        functions_json JSON,
        workflow TEXT,
        ai_suggestion TEXT,
        contact_name VARCHAR(100),
        contact_method VARCHAR(255),
        company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert data
    const result = await query(
      `INSERT INTO survey_submissions (email, industry, functions_json, workflow, ai_suggestion, contact_name, contact_method, company) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email || null, 
        actualIndustry || '', 
        JSON.stringify(actualFunctions), 
        workflow || '', 
        aiSuggestion || '', 
        contactName || '', 
        contactMethod || '', 
        company || ''
      ]
    );

    res.status(200).json({ success: true, insertId: result.insertId });
  } catch (error) {
    console.error('Survey DB error:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
}
