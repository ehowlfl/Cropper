// 필요한 라이브러리 포함
#include <Wire.h> // I2C 통신을 위한 라이브러리 (TCS34725 센서가 사용)
#include <Adafruit_TCS34725.h> // TCS34725 컬러 센서 라이브러리
#include <SoftwareSerial.h> // HC-06 블루투스 모듈을 위한 소프트웨어 시리얼 통신 라이브러리

// --- 핀 설정 ---
#define SENSOR_LED_PIN 13 // 센서 모듈의 내장 LED 또는 외부 LED 제어 핀 (선택 사항)
#define BUTTON_PIN 2    // 색상 측정을 트리거할 버튼 핀 (풀업 저항 사용)

// HC-06 블루투스 모듈 핀 설정
// RX 핀(아두이노의 TX)은 HC-06의 TXD에, TX 핀(아두이노의 RX)은 HC-06의 RXD에 연결
// 아두이노 우노 기준: D10(RX) -> HC-06 TXD, D11(TX) -> HC-06 RXD
// !! 중요: 실제 연결된 핀 번호에 맞춰 수정하세요. 예: SoftwareSerial BT_Master(3, 4);
SoftwareSerial BT_Master(10, 11); // RX, TX (아두이노 핀 번호)

// TCS34725 컬러 센서 객체 생성
// TCS34725_INTEGRATIONTIME_50MS: 측정 시간 50ms (길수록 정밀하지만 느림)
// TCS34725_GAIN_4X: 게인(민감도) 4배 (게인이 높을수록 어두운 빛도 잘 감지하지만 포화될 수 있음)
// 만약 값이 너무 낮거나 불안정하면 GAIN을 16X 또는 60X로 높여보세요.
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);

// --- 캘리브레이션 기준 값 설정 (매우 중요!) ---
// 이 값들은 '흰색 종이'처럼 가장 밝은 흰색 물체를 센서에 밀착시켜 측정했을 때 얻은 Raw 값입니다.
// 측정 환경(주변 밝기, 센서 LED 밝기 등)에 따라 달라지므로, 아래 단계를 거쳐 직접 측정 후 입력해야 합니다.
// (임의의 예시값입니다. 실제 측정값으로 반드시 교체하세요.)
uint16_t CALIBRATED_WHITE_R_RAW = 2650; // 흰색 측정 시 Red Raw 값
uint16_t CALIBRATED_WHITE_G_RAW = 1850; // 흰색 측정 시 Green Raw 값
uint16_t CALIBRATED_WHITE_B_RAW = 1200;  // 흰색 측정 시 Blue Raw 값
uint16_t CALIBRATED_WHITE_C_RAW = 1500; // 흰색 측정 시 Clear Raw 값 (전체 밝기 기준)

// --- 전역 변수 ---
unsigned long lastButtonPressTime = 0; // 마지막 버튼 눌림 시간
const unsigned long debounceDelay = 200; // 디바운스 딜레이 (버튼 중복 입력 방지)

void setup() {
  Serial.begin(9600); // 시리얼 모니터 통신 시작
  BT_Master.begin(9600); // 블루투스 시리얼 통신 시작 (HC-06의 기본 보율은 9600)

  pinMode(SENSOR_LED_PIN, OUTPUT); // 센서 LED 핀 출력으로 설정
  // 센서 LED 밝기를 analogWrite로 조절하여 빛의 양 자체를 조절할 수 있습니다.
  analogWrite(SENSOR_LED_PIN, 80); // 0 (완전히 끔) ~ 255 (가장 밝음)
                                  // 이 값을 줄이면 Raw 값들이 전반적으로 낮아질 수 있습니다.

  pinMode(BUTTON_PIN, INPUT_PULLUP); // 버튼 핀 입력 풀업 설정 (버튼을 누르면 LOW)

  // TCS34725 센서 초기화
  if (tcs.begin()) {
    Serial.println("TCS34725 Found!");
  } else {
    Serial.println("No TCS34725 found ... check your connections");
    while (1); // 센서가 없으면 무한 대기
  }
}

void loop() {
  // HC-06 블루투스 모듈의 수신 버퍼를 비웁니다.
  // 불필요한 데이터나 노이즈가 쌓이는 것을 방지합니다.
  while (BT_Master.available()) {
    BT_Master.read();
  }

  // 버튼이 눌렸는지 확인 (LOW는 버튼이 눌렸다는 의미)
  if (digitalRead(BUTTON_PIN) == LOW) {
    // 디바운싱: 일정 시간 내에 다시 눌리는 것을 무시
    if (millis() - lastButtonPressTime > debounceDelay) {
      Serial.println("Button pressed! Activating sensor and reading color...");
      
      // Raw RGBW 값 읽기
      uint16_t r, g, b, c; // Red, Green, Blue, Clear
      tcs.getRawData(&r, &g, &b, &c); // 센서로부터 Raw 데이터 읽기

      Serial.print("Raw Clear: "); Serial.print(c);
      Serial.print(", Raw Red: "); Serial.print(r);
      Serial.print(", Raw Green: "); Serial.print(g);
      Serial.print(", Raw Blue: "); Serial.println(b);

      // 색상 데이터를 블루투스로 전송하는 함수 호출
      sendColor(r, g, b, c);
      
      lastButtonPressTime = millis(); // 마지막 버튼 눌림 시간 업데이트
    }
  }
}

// 측정된 Raw RGBW 값을 기반으로 RGB 값을 계산하고 블루투스로 전송하는 함수
void sendColor(uint16_t r_raw, uint16_t g_raw, uint16_t b_raw, uint16_t c_raw) {
  // 1. 센서의 색상별 감도 불균형 보정 (캘리브레이션)
  // 각 Raw 값을 해당 색상의 흰색 기준 Raw 값으로 나누어 정규화합니다.
  // 0으로 나누는 것을 방지
  float R_calibrated_ratio = (CALIBRATED_WHITE_R_RAW > 0) ? (float)r_raw / CALIBRATED_WHITE_R_RAW : 0;
  float G_calibrated_ratio = (CALIBRATED_WHITE_G_RAW > 0) ? (float)g_raw / CALIBRATED_WHITE_G_RAW : 0;
  float B_calibrated_ratio = (CALIBRATED_WHITE_B_RAW > 0) ? (float)b_raw / CALIBRATED_WHITE_B_RAW : 0;

  // 정규화된 값들 중 최대값을 찾아 다시 0-1 스케일로 맞춥니다.
  // 이렇게 하면 가장 강한 색이 1.0이 됩니다. (원래의 Simple Scale과 유사)
  float max_calibrated_ratio = R_calibrated_ratio;
  if (G_calibrated_ratio > max_calibrated_ratio) max_calibrated_ratio = G_calibrated_ratio;
  if (B_calibrated_ratio > max_calibrated_ratio) max_calibrated_ratio = B_calibrated_ratio;

  // 모든 채널이 0이거나 매우 낮은 값일 때 (완전히 어두운 경우) - (0,0,0) 출력
  if (max_calibrated_ratio == 0) {
      Serial.println("Extremely dark after calibration, outputting (0,0,0).");
      BT_Master.print("RGB:0,0,0\n"); // LED를 끄기
      return;
  }

  // 다시 0-1 스케일로 맞춤 (가장 강한 채널이 1.0이 되도록)
  R_calibrated_ratio /= max_calibrated_ratio;
  G_calibrated_ratio /= max_calibrated_ratio;
  B_calibrated_ratio /= max_calibrated_ratio;

  // 2. 전체 밝기 보정 (현재 Clear 값을 기준으로)
  // CALIBRATED_WHITE_C_RAW는 흰색 기준의 Clear 값입니다.
  // 현재 측정된 Clear 값과 흰색 Clear 값의 비율을 계산하여 전체 밝기를 조절합니다.
  float brightness_factor = 1.0; // 기본 밝기는 100% (흰색 기준)
  if (CALIBRATED_WHITE_C_RAW > 0) { // 0으로 나누는 것 방지
      brightness_factor = (float)c_raw / CALIBRATED_WHITE_C_RAW;
      // 밝기 계수 제한: 최소 0.01 (1%) ~ 최대 1.0 (100%)
      // 0.01보다 작으면 0.01로, 1.0보다 크면 1.0으로 제한됩니다.
      brightness_factor = constrain(brightness_factor, 0.01, 1.0); 
  } else {
    Serial.println("Warning: CALIBRATED_WHITE_C_RAW not set for brightness scaling. Outputting full brightness.");
  }

  // 3. 최종 RGB 값 계산 (0-255 스케일링 + 밝기 계수 적용)
  // 0-1 스케일의 색상 비율에 255를 곱해 0-255 범위로 만들고, 마지막으로 밝기 계수를 곱합니다.
  int R_final = (int)(R_calibrated_ratio * 255.0 * brightness_factor);
  int G_final = (int)(G_calibrated_ratio * 255.0 * brightness_factor);
  int B_final = (int)(B_calibrated_ratio * 255.0 * brightness_factor);

  // 최종 RGB 값이 0-255 범위를 벗어나지 않도록 보정
  R_final = constrain(R_final, 0, 255);
  G_final = constrain(G_final, 0, 255);
  B_final = constrain(B_final, 0, 255);

  char payload[32]; // 블루투스 전송을 위한 문자열 버퍼
  sprintf(payload, "RGB:%d,%d,%d\n", R_final, G_final, B_final); // 형식에 맞춰 문자열 생성

  // 시리얼 모니터에 결과 출력
  Serial.print("Mapped RGB (Calibrated + Brightness): R="); Serial.print(R_final);
  Serial.print(", G="); Serial.print(G_final);
  Serial.print(", B="); Serial.println(B_final);
  Serial.print("Sent via Bluetooth: "); Serial.print(payload);

  BT_Master.print(payload); // 블루투스 모듈로 데이터 전송
}