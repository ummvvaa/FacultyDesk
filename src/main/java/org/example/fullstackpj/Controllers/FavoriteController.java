package org.example.fullstackpj.Controllers;

import lombok.RequiredArgsConstructor;
import org.example.fullstackpj.Service.UserService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final UserService userService;

    @PostMapping("/add/{recordId}")
    public String addFavorite(@PathVariable Long recordId, @RequestHeader(value = "referer", required = false) String referer) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        userService.addFavorite(username, recordId);
        return "redirect:" + (referer != null ? referer : "/");
    }

    @PostMapping("/remove/{recordId}")
    public String removeFavorite(@PathVariable Long recordId, @RequestHeader(value = "referer", required = false) String referer) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        userService.removeFavorite(username, recordId);
        return "redirect:" + (referer != null ? referer : "/");
    }


}

