// global.d.ts או types/i18n.d.ts

/**
 * הכרזה זו מבטיחה ש-TypeScript יטפל בייבוא JSON
 * כ-Record גנרי, מה שמונע את השגיאה 'never'.
 */
declare module "*.json" {
  const value: Record<string, any>;
  export default value;
}