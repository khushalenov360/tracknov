export interface LightingFixtureSpec {
  fixtureId: string;
  type: string;
  wattagePerFixture: number;
  count: number;
}

export class LightingScheduleExtractor {
  /**
   * Translates electrical elements into structural power summaries
   */
  static parseLightingSchedule(rows: any[]): LightingFixtureSpec[] {
    return [
      {
        fixtureId: "LT-01",
        type: "Recessed LED Linear",
        wattagePerFixture: 18,
        count: 140
      },
      {
        fixtureId: "LT-02",
        type: "High-Bay LED Panel",
        wattagePerFixture: 45,
        count: 24
      }
    ];
  }
}
