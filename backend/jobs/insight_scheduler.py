"""
Insight Scheduler - Background job scheduler for auto-generating insights

Schedules:
- Daily insights: Every day at 8:00 AM
- Weekly insights: Every Monday at 9:00 AM
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from backend.config.base_config import Settings
from backend.api.services.proactive_analysis_service import ProactiveAnalysisService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


def generate_daily_insights_job():
    """Job function for daily insights generation"""
    logger.info("Starting daily insights generation job...")

    settings = Settings()
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        service = ProactiveAnalysisService(db)
        insights = service.generate_daily_insights(account_id=None)

        if insights:
            logger.info(f"✅ Generated {len(insights)} daily insight(s)")
            for insight in insights:
                logger.info(f"  - {insight['priority'].upper()}: {insight['title']}")
        else:
            logger.info("No daily insights generated (no data or error)")

    except Exception as e:
        logger.error(f"❌ Daily insights job failed: {e}")

    finally:
        db.close()
        engine.dispose()


def generate_weekly_insights_job():
    """Job function for weekly insights generation"""
    logger.info("Starting weekly insights generation job...")

    settings = Settings()
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        service = ProactiveAnalysisService(db)
        insights = service.generate_weekly_insights(account_id=None)

        if insights:
            logger.info(f"✅ Generated {len(insights)} weekly insight(s)")
            for insight in insights:
                logger.info(f"  - {insight['priority'].upper()}: {insight['title']}")
        else:
            logger.info("No weekly insights generated (no data or error)")

    except Exception as e:
        logger.error(f"❌ Weekly insights job failed: {e}")

    finally:
        db.close()
        engine.dispose()


def start_scheduler():
    """
    Initialize and start the scheduler.
    Should be called when FastAPI app starts.
    """
    global scheduler

    if scheduler is not None:
        logger.warning("Scheduler already running")
        return scheduler

    scheduler = BackgroundScheduler(timezone='UTC')

    # Daily insights: Every day at 8:00 AM UTC
    scheduler.add_job(
        generate_daily_insights_job,
        trigger=CronTrigger(hour=8, minute=0),
        id='daily_insights',
        name='Generate Daily Insights',
        replace_existing=True
    )

    # Weekly insights: Every Monday at 9:00 AM UTC
    scheduler.add_job(
        generate_weekly_insights_job,
        trigger=CronTrigger(day_of_week='mon', hour=9, minute=0),
        id='weekly_insights',
        name='Generate Weekly Insights',
        replace_existing=True
    )

    scheduler.start()
    logger.info("✅ Insight scheduler started")
    logger.info("  - Daily insights: Every day at 8:00 AM UTC")
    logger.info("  - Weekly insights: Every Monday at 9:00 AM UTC")

    return scheduler


def stop_scheduler():
    """
    Stop the scheduler.
    Should be called when FastAPI app shuts down.
    """
    global scheduler

    if scheduler is not None:
        scheduler.shutdown()
        scheduler = None
        logger.info("✅ Insight scheduler stopped")


def trigger_daily_insights_now():
    """
    Manually trigger daily insights generation (for testing).
    """
    logger.info("🔧 Manually triggering daily insights...")
    generate_daily_insights_job()


def trigger_weekly_insights_now():
    """
    Manually trigger weekly insights generation (for testing).
    """
    logger.info("🔧 Manually triggering weekly insights...")
    generate_weekly_insights_job()


# For testing purposes - run scheduler as standalone script
if __name__ == "__main__":
    logger.info("Starting scheduler in standalone mode (for testing)...")
    logger.info("Press Ctrl+C to stop")

    scheduler_instance = start_scheduler()

    try:
        # Keep the script running
        import time
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Stopping scheduler...")
        stop_scheduler()
