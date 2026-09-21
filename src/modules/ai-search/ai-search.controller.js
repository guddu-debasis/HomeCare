import * as aiSearchService from "./ai-search.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const searchServices = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { query } = req.body;
    const result = await aiSearchService.searchServices({ customerId, query });
    return ApiResponse.success(res, "Search complete", result);
  } catch (error) {
    next(error);
  }
};

export { searchServices };
