import { prisma } from '@wirecrest/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { reviewId, field, value } = req.body;

  if (!reviewId || !field) {
    return res.status(400).json({ error: { message: 'Review ID and field are required' } });
  }

  try {
    // For GoogleReview, we can only update the responseFromOwnerText field
    if (field === 'reply') {
      const review = await prisma.googleReview.update({
        where: { id: reviewId },
        data: {
          responseFromOwnerText: value as string,
          responseFromOwnerDate: new Date(),
        },
      });

      return res.status(200).json(review);
    } else {
      // For now, return success but don't update anything for isRead/isImportant
      // These would need to be stored in ReviewMetadata or a separate table
      return res.status(200).json({ message: 'Status field not supported yet' });
    }
  } catch (error: any) {
    console.error('Error updating review:', error);
    return res.status(500).json({
      error: { message: `Failed to update review: ${error.message}` },
    });
  }
}
