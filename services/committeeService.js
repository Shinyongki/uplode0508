// 구글 시트에서 위원 데이터를 읽어 반환하는 함수
const getAllCommitteesFromSheet = async () => {
  // 임시 하드코딩 데이터 반환 (실제로는 구글 시트에서 데이터를 읽어야 함)
  return [
    { 이름: '신용기', ID: 'C001', 역할: 'committee' },
    { 이름: '문일지', ID: 'C002', 역할: 'committee' },
    { 이름: '김수연', ID: 'C003', 역할: 'committee' },
    { 이름: '이연숙', ID: 'C004', 역할: 'committee' },
    { 이름: '이정혜', ID: 'C005', 역할: 'committee' }
  ];
}; 