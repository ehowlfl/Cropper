#include <SoftwareSerial.h> // 블루투스 통신용 라이브러리 포함
#include <ArduinoJson.h> // JSON 파싱을 위한 라이브러리 추가

// =========================================================
// HC-06 블루투스 모듈 핀 정의
// HC-06 TXD  -> 아두이노 D10 (SoftwareSerial RX)
// HC-06 RXD  -> 아두이노 D11 (SoftwareSerial TX)
//               *** HC-06 RXD는 아두이노 D11에서 오는 5V 신호에 대해 전압 분배 저항(1k옴 + 2k옴) 필요! ***
// =========================================================
#define BT_RX_PIN 10
#define BT_TX_PIN 11
SoftwareSerial BT_Slave(BT_RX_PIN, BT_TX_PIN);

// =========================================================
// RGB LED 핀 정의 (PWM 가능한 핀 사용)
// 공통 캐소드(Common Cathode) RGB LED 기준
// RGB LED R  -> 220옴 저항 -> 아두이노 D5
// RGB LED G  -> 220옴 저항 -> 아두이노 D6
// RGB LED B  -> 220옴 저항 -> 아두이노 D9
// RGB LED 공통  -> 아두이노 GND
// =========================================================
#define RGB_R_PIN 5 // 디지털 5번 핀 (PWM)
#define RGB_G_PIN 6 // 디지털 6번 핀 (PWM)
#define RGB_B_PIN 9 // 디지털 9번 핀 (PWM)

#define PIN_2 2
#define PIN_3 3
#define PIN_4 4

// 시리얼 모니터 및 블루투스로부터 수신된 명령어를 저장할 String 변수
String serialInputBuffer = "";
String btCommandBuffer = ""; // 블루투스 명령어 수신 버퍼
boolean btReceivingCommand = false; // 명령어 수신 중 플래그

// 핀 제어 규칙 구조체 (애플리케이션의 PinControlRule과 유사)
struct PinControlRule {
  String id; // 규칙의 고유 ID
  int colorR, colorG, colorB; // 매칭할 RGB 값
  int pinNumber; // 제어할 핀 번호
  String pinState; // 핀의 상태 ("HIGH" 또는 "LOW")
};

// 핀 제어 규칙을 저장할 고정 크기 배열
const int MAX_RULES = 5; // 최대 규칙 수
PinControlRule rules[MAX_RULES];
int currentRuleCount = 0; // 현재 저장된 규칙 수

void setup() {
  Serial.begin(9600);
  Serial.println("==========================================");
  Serial.println("  Arduino LED Control Unit Ready.");
  Serial.println("==========================================");
  Serial.println("You can send commands via Serial Monitor or Bluetooth.");
  Serial.println("  - To control RGB LED: Type 'RGB:R,G,B' (e.g., RGB:255,0,0) and press Enter.");
  Serial.println("  - To add a rule: Type 'RULE:{json_string}' (e.g., RULE:{\"id\":\"1\",\"colorR\":1,\"colorG\":1,\"colorB\":1,\"pinNumber\":2,\"pinState\":\"HIGH\"}) and press Enter.");
  Serial.println("  - Make sure Serial Monitor 'Line ending' is set to 'Newline'.");
  Serial.println("==========================================");

  // RGB LED 핀 설정
  pinMode(RGB_R_PIN, OUTPUT);
  pinMode(RGB_G_PIN, OUTPUT);
  pinMode(RGB_B_PIN, OUTPUT);

  // 추가된 디지털 핀 설정
  pinMode(PIN_2, OUTPUT);
  pinMode(PIN_3, OUTPUT);
  pinMode(PIN_4, OUTPUT);

  BT_Slave.begin(9600);
  Serial.println("Bluetooth Slave (HC-06) Ready. Waiting for connection...");

  setColor(0, 0, 0);

  Serial.println("RGB LED initialized to OFF state.");
  Serial.println("Setup complete. Ready to receive commands.");
}

void loop() {
  // === 시리얼 모니터로부터 문자 수신 처리 ===
  while (Serial.available()) {
    char incomingChar = Serial.read();
    if (incomingChar == '\n') { // 개행 문자가 수신되면, 명령 처리
      if (serialInputBuffer.startsWith("RGB:")) {
        processRgbCommand(serialInputBuffer, "Serial Monitor");
      } else if (serialInputBuffer.startsWith("RULE:")) {
        processRuleCommand(serialInputBuffer, "Serial Monitor");
      } else {
        Serial.print("Unknown command from Serial Monitor: ");
        Serial.println(serialInputBuffer);
      }
      serialInputBuffer = ""; // 버퍼 초기화
    } else if (incomingChar != '\r') { // 캐리지 리턴(\r)은 무시
      serialInputBuffer += incomingChar;
    }
  }

  // === 블루투스로부터 문자 수신 처리 ===
  if (BT_Slave.available() > 0) {
    char incomingChar = BT_Slave.read();

    if (incomingChar == '[') { // 명령어 시작
      btCommandBuffer = "["; // 버퍼 초기화 및 시작 문자 추가
      btReceivingCommand = true;
    } else if (btReceivingCommand) {
      if (incomingChar == ']') { // 명령어 종료
        btCommandBuffer += ']'; // 종료 문자 추가
        btReceivingCommand = false;
        String originalCommand = btCommandBuffer;
        
        Serial.print("BT Original Command (before clean): '");
        Serial.print(originalCommand);
        Serial.println("'");

        String cleanedCommand = cleanCommand(originalCommand);

        Serial.print("BT Cleaned Command (after clean): '");
        Serial.print(cleanedCommand);
        Serial.print("', Length: ");
        Serial.println(cleanedCommand.length());

        // 추가 디버깅: cleanedCommand의 각 문자 ASCII 값 출력
        Serial.print("Cleaned Command ASCII: ");
        for (int i = 0; i < cleanedCommand.length(); i++) {
          Serial.print((int)cleanedCommand.charAt(i));
          Serial.print(" ");
        }
        Serial.println();

        if (cleanedCommand.startsWith("RGB:")) {
          Serial.println("DEBUG: Matched startsWith('RGB:')");
          Serial.print("Received RGB command from Bluetooth: '");
          Serial.print(cleanedCommand);
          Serial.println("'");
          processRgbCommand(cleanedCommand, "Bluetooth"); // cleanedCommand 사용
        } else if (cleanedCommand.startsWith("RULE:")) {
          Serial.println("DEBUG: Matched startsWith('RULE:')");
          Serial.print("Received RULE command from Bluetooth: '");
          Serial.print(cleanedCommand);
          Serial.println("'");
          processRuleCommand(cleanedCommand, "Bluetooth"); // cleanedCommand 사용
        } else if (cleanedCommand.length() > 0) {
          Serial.println("DEBUG: Did NOT match RGB or RULE, and length > 0");
          Serial.print("Unknown command from Bluetooth (original): ");
          Serial.println(originalCommand);
          Serial.print("Unknown command from Bluetooth (cleaned): ");
          Serial.println(cleanedCommand);
        } else {
          Serial.println("DEBUG: Did NOT match RGB or RULE, and length IS 0");
          // Potentially empty or whitespace-only command after cleaning
          Serial.println("Received empty or invalid command structure from Bluetooth.");
        }
        btCommandBuffer = ""; // 버퍼 비우기
      } else {
        // 명령어 중간 문자들을 버퍼에 추가
        // 버퍼 오버플로우 방지 로직 추가 필요 (예: 최대 길이 제한)
        if (btCommandBuffer.length() < 255) { // 예시: 최대 255자
            btCommandBuffer += incomingChar;
        } else {
            // 버퍼 오버플로우 처리 (예: 명령어 무시, 에러 로그)
            Serial.println("Error: BT Command buffer overflow!");
            btCommandBuffer = "";
            btReceivingCommand = false;
        }
      }
    }
    // '['로 시작하지 않는 문자는 무시 (명령어 동기화)
  }

  // loop() 함수가 너무 빨리 돌아서 문제가 되는 경우를 대비한 작은 딜레이 (필요 시 주석 해제)
  // delay(5);
}

// =========================================================
// 규칙 명령을 파싱하고 저장하는 함수
// =========================================================
void processRuleCommand(String command, String source) {
  Serial.print("\nReceived RULE command from "); Serial.print(source);
  Serial.print(": '"); Serial.print(command); Serial.println("'");

  String jsonString = command.substring(5); // 'RULE:' 부분을 제거
  jsonString.trim();

  // JSON 문서 크기 설정 (규칙 하나의 크기에 따라 조절)
  StaticJsonDocument<256> doc; // 256 바이트는 예시, 실제 JSON 크기에 맞게 조절 필요

  DeserializationError error = deserializeJson(doc, jsonString);

  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    return;
  }

  // JSON 파싱 성공, 규칙 구조체에 저장
  PinControlRule newRule;
  newRule.id = doc["id"].as<String>();
  newRule.colorR = doc["colorR"].as<int>();
  newRule.colorG = doc["colorG"].as<int>();
  newRule.colorB = doc["colorB"].as<int>();
  newRule.pinNumber = doc["pinNumber"].as<int>();
  newRule.pinState = doc["pinState"].as<String>();

  // 기존 규칙 중복 확인 및 업데이트
  bool ruleExists = false;
  for (int i = 0; i < currentRuleCount; i++) {
    if (rules[i].id == newRule.id) {
      rules[i] = newRule; // 업데이트
      ruleExists = true;
      Serial.print("Rule updated: "); Serial.println(newRule.id);
      break;
    }
  }

  if (!ruleExists) {
    if (currentRuleCount < MAX_RULES) {
      rules[currentRuleCount] = newRule; // 새 규칙 추가
      currentRuleCount++;
      Serial.print("New rule added: "); Serial.println(newRule.id);
    } else {
      Serial.println("Max rules reached. Cannot add new rule.");
    }
  }

  // 현재 저장된 모든 규칙 출력 (디버깅용)
  Serial.println("Current Rules:");
  for (int i = 0; i < currentRuleCount; i++) {
    Serial.print("  ID: "); Serial.print(rules[i].id);
    Serial.print(", Color: "); Serial.print(rules[i].colorR); Serial.print(","); Serial.print(rules[i].colorG); Serial.print(","); Serial.print(rules[i].colorB);
    Serial.print(", Pin: "); Serial.print(rules[i].pinNumber);
    Serial.print(", State: "); Serial.println(rules[i].pinState);
  }
}

// =========================================================
// RGB 명령을 파싱하고 LED를 제어하는 함수
// =========================================================
void processRgbCommand(String command, String source) {
  Serial.print("\nReceived from "); Serial.print(source);
  Serial.print(": '"); Serial.print(command); Serial.println("'");

  // 수신된 데이터가 'RGB:R,G,B' 형식으로 시작하는지 확인
  if (command.startsWith("RGB:")) {
    String rgbString = command.substring(4); // 'RGB:' 부분을 제거하고 "R,G,B"만 추출
    rgbString.trim(); // 양 끝 공백 제거 (trim()은 '\r', '\n' 등도 제거)

    // 쉼표(,)를 기준으로 R, G, B 값 파싱
    int firstCommaIndex = rgbString.indexOf(',');
    int secondCommaIndex = rgbString.indexOf(',', firstCommaIndex + 1);

    if (firstCommaIndex != -1 && secondCommaIndex != -1) {
      String rStr = rgbString.substring(0, firstCommaIndex);
      String gStr = rgbString.substring(firstCommaIndex + 1, secondCommaIndex);
      String bStr = rgbString.substring(secondCommaIndex + 1);

      int rValue = rStr.toInt();
      int gValue = gStr.toInt();
      int bValue = bStr.toInt();

      rValue = constrain(rValue, 0, 255);
      gValue = constrain(gValue, 0, 255);
      bValue = constrain(bValue, 0, 255);

      Serial.print("Parsed RGB: R="); Serial.print(rValue);
      Serial.print(", G="); Serial.print(gValue);
      Serial.print(", B="); Serial.println(bValue);

      setColor(rValue, gValue, bValue);
      Serial.println("RGB LED color updated.");

      // 저장된 규칙을 확인하고 적용
      for (int i = 0; i < currentRuleCount; i++) {
        const auto& rule = rules[i];
        if (rule.colorR == rValue && rule.colorG == gValue && rule.colorB == bValue) {
          Serial.print("Matching rule found for ID: "); Serial.println(rule.id);
          // 핀 제어
          if (rule.pinState == "HIGH") {
            digitalWrite(rule.pinNumber, HIGH);
            Serial.print("Pin "); Serial.print(rule.pinNumber); Serial.println(" set to HIGH.");
          } else if (rule.pinState == "LOW") {
            digitalWrite(rule.pinNumber, LOW);
            Serial.print("Pin "); Serial.print(rule.pinNumber); Serial.println(" set to LOW.");
          }
        }
      }

    } else {
      Serial.println("Error: Invalid RGB format received. (Missing commas or values)");
    }
  } else {
    // RGB: 로 시작하지 않는 경우의 에러 메시지
    Serial.println("Error: Received data does not start with 'RGB:'.");
  }
}

// =========================================================
// RGB LED 색상 설정 함수
// =========================================================
void setColor(int r, int g, int b) {
  analogWrite(RGB_R_PIN, r);
  analogWrite(RGB_G_PIN, g);
  analogWrite(RGB_B_PIN, b);
}

/*
// 만약 공통 애노드(Common Anode) RGB LED를 사용한다면, 위 setColor 대신 아래 함수를 사용하세요:
// (공통 애노드: 0이 가장 밝고 255가 어두움)
// void setColor(int r, int g, int b) {
//   analogWrite(RGB_R_PIN, 255 - r);
//   analogWrite(RGB_G_PIN, 255 - g);
//   analogWrite(RGB_B_PIN, 255 - b);
// }
*/

// 대괄호 제거 함수
String cleanCommand(String command) {
  if (command.startsWith("[") && command.endsWith("]")) {
    return command.substring(1, command.length() - 1);
  }
  return command;
}