const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { readFromSheet, writeToSheet, appendToSheet } = require('../services/googleSheets');

// Google API 인증 설정
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// 환경변수로 서비스 계정 사용 여부 및 키 파일 경로 설정
const USE_SERVICE_ACCOUNT = process.env.USE_SERVICE_ACCOUNT === 'true';
const SERVICE_ACCOUNT_KEY_PATH = process.env.SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, '..', 'service-account.json');

// OAuth2 클라이언트 생성
const getAuthClient = () => {
  if (USE_SERVICE_ACCOUNT) {
    // 서비스 계정 키 파일로 JWT 클라이언트 생성
    const key = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
    return new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      SCOPES
    );
  }
  // 기존 OAuth2 사용자 인증 방식
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]
  );
  // 저장된 토큰이 있으면 세팅
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
  }
  return oAuth2Client;
};

// 구글 시트 인스턴스 생성
const getSheets = () => {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
};

// 인증 URL 생성
const getAuthUrl = () => {
  const oAuth2Client = getAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
};

// 인증 토큰 저장
const saveToken = async (code) => {
  const oAuth2Client = getAuthClient();
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    return true;
  } catch (error) {
    console.error('Error while trying to retrieve access token', error);
    return false;
  }
};

// 구글 시트 데이터 읽기
const readSheetData = async (spreadsheetId, range) => {
  try {
    console.log(`구글 시트 데이터 읽기 시작: ${spreadsheetId}, 범위: ${range}`);
    const result = await readFromSheet(spreadsheetId, range);
    console.log(`구글 시트 데이터 읽기 성공: ${result ? result.length : 0}개 행`);
    return result;
  } catch (error) {
    console.error(`구글 시트 데이터 읽기 실패: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
};

// 구글 시트 데이터 쓰기
const writeSheetData = async (spreadsheetId, range, values) => {
  return writeToSheet(spreadsheetId, range, values);
};

// 구글 시트 데이터 추가
const appendSheetData = async (spreadsheetId, range, values) => {
  return appendToSheet(spreadsheetId, range, values);
};

// 스프레드시트의 모든 시트 이름 목록 조회
const listAllSheets = async (spreadsheetId) => {
  try {
    console.log(`스프레드시트 시트 목록 조회 시작: ${spreadsheetId}`);
    const sheets = getSheets();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });
    
    if (response.data && response.data.sheets) {
      const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
      console.log(`시트 목록 조회 성공: ${sheetNames.length}개 시트 발견`);
      return sheetNames;
    }
    
    console.log('시트 정보가 없습니다.');
    return [];
  } catch (error) {
    console.error(`시트 목록 조회 실패: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
};

module.exports = {
  getAuthUrl,
  saveToken,
  readSheetData,
  writeSheetData,
  appendSheetData,
  getSheets,
  getAuthClient,
  listAllSheets
}; 