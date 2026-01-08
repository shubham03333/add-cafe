import { NextRequest, NextResponse } from 'next/server';
import { dataArchiver } from '@/lib/data-archiver';

export async function POST(request: NextRequest) {
  try {
    console.log('🗃️ Starting manual data archiving process...');

    const result = await dataArchiver.runFullArchive();

    return NextResponse.json({
      success: true,
      message: 'Data archiving completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Error during data archiving:', error);
    return NextResponse.json(
      {
        error: 'Failed to archive data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await dataArchiver.getArchiveStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching archive stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch archive statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
