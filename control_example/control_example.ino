#include <Dynamixel2Arduino.h>

// Serial on OpenRB-150
#define DXL_SERIAL Serial1
#define DEBUG_SERIAL Serial
const uint8_t DXL_DIR_PIN = 2; // OpenRB-150 configure

const uint8_t DXL_ID = 1;               // Single Dynamixel
const uint32_t DXL_BAUDRATE = 57600;    // Baud rate
const float DXL_PROTOCOL_VERSION = 2.0; // Protocol version

int32_t goal_position[2] = {1200, 2000}; // Target angle 
int8_t direction = 0;                    // Select target angle

unsigned long old_now = millis(); // Timer
unsigned long timer = 0;          // Select target timer
float dt = 0;                     // Changed time

int32_t error = 0;       // Error
int32_t error_i = 0;     // Error I term
int32_t error_d = 0;     // Error D term
int32_t old_error = 0;   // Old Error

float p_gain = 1;        // P gain
float i_gain = 0.000005; // I gain
float d_gain = 0.000002; // D gain

// Connect OpenRB-150 2 Dynamixel
Dynamixel2Arduino dxl(DXL_SERIAL, DXL_DIR_PIN);

// Load dynamixel control commands
using namespace ControlTableItem;

void setup() {
  // put your setup code here, to run once:
  DEBUG_SERIAL.begin(57600); // Initiate Serial communication
  while(!DEBUG_SERIAL)       // Wait until Serial commu

  dxl.begin(DXL_BAUDRATE);                          // Set Dynamixel baudrate
  dxl.setPortProtocolVersion(DXL_PROTOCOL_VERSION); // Set protocol number
  dxl.ping(DXL_ID);                                 // Connect to Dynamixel

  dxl.torqueOff(DXL_ID);                     // Turn off Dynamixel
  dxl.setOperatingMode(DXL_ID, OP_VELOCITY); // Select Operating mode - Velocity
  dxl.torqueOn(DXL_ID);                      // Turn on Dynamixel

  /*
  dxl.writeControlTableItem(POSITION_P_GAIN, DXL_ID, position_p_gain);
  dxl.writeControlTableItem(POSITION_I_GAIN, DXL_ID, position_i_gain);
  dxl.writeControlTableItem(POSITION_D_GAIN, DXL_ID, position_d_gain);
  */
}

void loop() {
  // put your main code here, to run repeatedly:
  unsigned long now = millis(); // current time
  int32_t current_pos = dxl.getPresentPosition(DXL_ID); // current position
  error = goal_position[direction] - current_pos;       // position error
  dt = (now - old_now)/1000; // time delay
  if (dt == 0) dt = 0.001;     // Set initial time delay

  error_i += error * dt;              // Error I term
  error_d = (error - old_error) / dt; // Error D term

  float raw_spd = (p_gain * error) + (i_gain * error_i) + (d_gain * error_d);

  old_error = error;                       // Update old error
  old_now = now;                           // Update old time
  raw_spd = constrain(raw_spd, -255, 255); // Constrain Dynamixel Speed

  dxl.setGoalVelocity(DXL_ID, raw_spd); // Move Dynamixel - Speed

  // Target position
  DEBUG_SERIAL.print("Goal_Position:");
  DEBUG_SERIAL.print(goal_position[direction]);
  DEBUG_SERIAL.print(",");
  // Present posiiton
  DEBUG_SERIAL.print("Present_Position:");
  DEBUG_SERIAL.print(dxl.getPresentPosition(DXL_ID));
  DEBUG_SERIAL.print(",");
  // Error
  DEBUG_SERIAL.print("ERROR:");
  DEBUG_SERIAL.print(error);
  DEBUG_SERIAL.print(",");
  // Dynamixel Speed
  DEBUG_SERIAL.print("spd:");
  DEBUG_SERIAL.print(raw_spd);
  DEBUG_SERIAL.println();

  // Target update function
  if (millis() - timer > 3000) {
    // Choose the target position
    if(direction == 1) direction = 0;
    else direction = 1;

    error_i = 0;      // Reset error I term 
    timer = millis(); // Reset target Timer
  }

  delay(10); // Operating Duty: near 10ms

}