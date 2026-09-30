import { Zap, Thermometer, Cpu } from 'lucide-react';
import { useRobot } from '../sim/RobotContext';
import { Card, Meter } from '../components/ui';
import { LOADS, SPEC, ARM } from '../sim/robot';

const TRACK = 0.46; // m, wheel separation

export default function Health() {
  const { s } = useRobot();
  const b = s.battery;
  const soc = b.ah / b.cap;
  const segs = 10, lit = Math.round(soc * segs);

  const loads = [
    ...LOADS.map((l) => ({ ...l })),
    { key: 'motors', label: 'Drive motors ×2', amps: b.motorI || 0, live: true },
    { key: 'arm', label: 'Inspection arm', amps: b.armI || 0.3, live: true },
  ];
  const total = loads.reduce((a, l) => a + l.amps, 0);

  const wheel = (sign) => ((s.vel.v + sign * s.vel.w * TRACK / 2) / (2 * Math.PI * SPEC.wheelRadius)) * 60;
  const drives = [
    { name: 'Left drive', rpm: wheel(-1), temp: s.motors.lt, amps: (b.motorI || 0) / 2 },
    { name: 'Right drive', rpm: wheel(1), temp: s.motors.rt, amps: (b.motorI || 0) / 2 },
    { name: 'Cytron MDD20A', rpm: null, temp: s.motors.drv, amps: b.motorI || 0 },
  ];

  const moving = Math.abs(s.vel.v) > 0.01 || Math.abs(s.vel.w) > 0.01;
  const jitter = (hz, i) => hz * (1 + 0.04 * Math.sin(s.t * 1.7 + i * 2.3));
  const nodes = [
    ['/rplidar_node', 'sensor_msgs/LaserScan', 7.6, 'run'],
    ['/imu_node', 'sensor_msgs/Imu', 50, 'run'],
    ['/ultrasonic_node', 'sensor_msgs/Range', 20, 'run'],
    ['/slam_toolbox', 'nav_msgs/OccupancyGrid', 1, 'run'],
    ['/bt_navigator', 'Nav2 behaviour tree', s.goal ? 10 : 0, s.goal ? 'run' : 'idle'],
    ['/controller_server', 'geometry_msgs/Twist', s.goal ? 20 : 0, s.goal ? 'run' : 'idle'],
    ['/planner_server', 'nav_msgs/Path', s.goal ? 1 : 0, s.goal ? 'run' : 'idle'],
    ['/diff_drive_controller', 'nav_msgs/Odometry', s.estop ? 0 : 30, s.estop ? 'halt' : 'run'],
    ['/teleop_node', 'geometry_msgs/Twist', s.mode === 'manual' ? 15 : 0, s.mode === 'manual' ? 'run' : 'idle'],
    ['/arm_controller', 'sensor_msgs/JointState', s.estop ? 0 : 25, s.estop ? 'halt' : 'run'],
    ['/web_video_server', 'MJPEG stream', 24, 'run'],
    ['/rosbridge_websocket', 'HMI bridge · :9090', 12, 'run'],
    ['/battery_status', 'sensor_msgs/BatteryState', 1, 'run'],
  ];

  return (
    <div className="page">
      <div className="grid g-health">
        <Card title="Battery" sub="12 V 45 Ah Li-ion pack">
          <div className="batt">
            <div className="batt-cells" aria-label={`${Math.round(soc * 100)} percent`}>
              {Array.from({ length: segs }, (_, i) => <i key={i} className={i < lit ? (soc < 0.2 ? 'on low' : 'on') : ''} />)}
              <span className="batt-cap" />
            </div>
            <div className="batt-pct mono">{(soc * 100).toFixed(1)}<small>%</small></div>
          </div>
          <dl className="kv four">
            <div><dt>Voltage</dt><dd className="mono">{b.voltage.toFixed(2)} V</dd></div>
            <div><dt>Current</dt><dd className="mono">{b.current.toFixed(1)} A</dd></div>
            <div><dt>Remaining</dt><dd className="mono">{b.ah.toFixed(1)} Ah</dd></div>
            <div><dt>Runtime @ now</dt><dd className="mono">{(b.ah / b.current).toFixed(1)} h</dd></div>
          </dl>
          <p className="note">Design runtime at full load (13.2 A): <b>{(45 / 13.2).toFixed(1)} h</b></p>
        </Card>

        <Card title="Power draw" sub="Live split per subsystem" action={<span className="pill mono"><Zap size={14} /> {(total * b.voltage).toFixed(0)} W</span>}>
          <div className="stack">
            {loads.map((l) => <i key={l.key} className={`seg-${l.key}`} style={{ flexGrow: Math.max(0.001, l.amps) }} title={`${l.label} ${l.amps.toFixed(1)} A`} />)}
          </div>
          <ul className="loads">
            {loads.map((l) => (
              <li key={l.key}>
                <span className={`sw seg-${l.key}`} />
                <span>{l.label}{l.live && <em>live</em>}</span>
                <b className="mono">{l.amps.toFixed(1)} A</b>
              </li>
            ))}
            <li className="total"><span /><span>Total</span><b className="mono">{total.toFixed(1)} A</b></li>
          </ul>
        </Card>

        <Card title="Drive train" sub="Planetary DC motors with encoders">
          <div className="drives">
            {drives.map((d) => (
              <div key={d.name} className="drive">
                <div className="drive-h"><span>{d.name}</span>{d.rpm !== null && <b className="mono">{d.rpm.toFixed(0)} rpm</b>}</div>
                <div className="drive-row">
                  <Thermometer size={15} />
                  <Meter value={(d.temp - 20) / 60} tone={d.temp > 60 ? 'bad' : d.temp > 45 ? 'warn' : ''} />
                  <span className="mono">{d.temp.toFixed(0)}°C</span>
                </div>
                <div className="drive-row">
                  <Zap size={15} />
                  <Meter value={d.amps / 20} />
                  <span className="mono">{d.amps.toFixed(1)} A</span>
                </div>
              </div>
            ))}
          </div>
          <p className="note">{moving ? 'Drives under load.' : 'Drives idle — holding position.'} Driver limit 20 A continuous.</p>
        </Card>
      </div>

      <div className="grid g-2w">
        <Card title="ROS 2 graph" sub="Humble · DDS · 13 nodes" action={<span className="pill ok mono"><Cpu size={14} /> Pi 4 · 41% CPU</span>}>
          <div className="nodes">
            {nodes.map(([n, topic, hz, st], i) => (
              <div key={n} className={`node ${st}`}>
                <span className="node-dot" />
                <div className="node-txt"><b className="mono">{n}</b><span>{topic}</span></div>
                <span className="node-hz mono">{hz ? `${jitter(hz, i).toFixed(1)} Hz` : st}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Design specification" sub="From the project design calculations">
          <dl className="specs">
            <div><dt>Robot mass</dt><dd>{SPEC.robotMass} kg</dd></div>
            <div><dt>Max tow load</dt><dd>{SPEC.maxTow} kg</dd></div>
            <div><dt>Operating speed</dt><dd>{SPEC.opSpeed} m/s</dd></div>
            <div><dt>Gradeability</dt><dd>{SPEC.gradeability}° incline</dd></div>
            <div><dt>Torque / motor</dt><dd>{SPEC.motorTorque} N·m @ {SPEC.motorRpm} rpm</dd></div>
            <div><dt>Drive</dt><dd>Differential, 2 + 2 castors</dd></div>
            <div><dt>Battery</dt><dd>{SPEC.battery.volts} V · {SPEC.battery.ah} Ah Li-ion</dd></div>
            <div><dt>Arm</dt><dd>4 DOF · {ARM.L2 + ARM.L3 + ARM.L4} cm reach</dd></div>
            <div><dt>Arm work volume</dt><dd>0.434 m³</dd></div>
            <div><dt>Perception</dt><dd>RPLiDAR A1 · depth cam · IMU</dd></div>
            <div><dt>Compute</dt><dd>Raspberry Pi 4 B + Arduino</dd></div>
            <div><dt>Middleware</dt><dd>ROS 2 Humble · Nav2</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
