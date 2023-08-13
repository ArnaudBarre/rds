import { writeFileSync } from "node:fs";

export const stopProfiler = () => {
  if (global.__rds_profile_session) {
    global.__rds_profile_session.post("Profiler.stop", (err, { profile }) => {
      if (err) {
        throw err;
      } else {
        const path = "rds-profile.cpuprofile";
        writeFileSync(path, JSON.stringify(profile));
        console.log(`Profile save to ${path}`);
      }
    });
  }
};
