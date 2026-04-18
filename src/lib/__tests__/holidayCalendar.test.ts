import { getHolidayForDate } from "../holidayCalendar";

global.fetch = jest.fn() as jest.Mock;

describe("holidayCalendar.ts -> getHolidayForDate()", () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        jest.resetModules();
    });

    it("debe retornar null cuando tira un error (fall back vacío)", async () => {
        const { getHolidayForDate } = await import("../holidayCalendar");
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));
        const result = await getHolidayForDate("2026-01-01");
        expect(result).toBeNull();
    });

    it("debe analizar el archivo ICS correctamente y retornar el nombre del dia festivo", async () => {
        const { getHolidayForDate } = await import("../holidayCalendar");
        const mockIcs = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260916
SUMMARY:Día de la Independencia
END:VEVENT
END:VCALENDAR`;
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            text: jest.fn().mockResolvedValue(mockIcs)
        });

        // Este usa Date.now() + 10min TTL cuando parsea, así que funcionará
        const result = await getHolidayForDate("2026-09-16");
        expect(result).toEqual({ date: "2026-09-16", name: "Día de la Independencia" });
    });
});
